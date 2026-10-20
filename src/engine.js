import Papa from 'papaparse';
export const playerStats={points:'Puntos',rebounds:'Rebotes',assists:'Asistencias',threeMade:'Triples anotados',threeAttempted:'Triples intentados',fieldMade:'Tiros de campo anotados',fieldAttempted:'Tiros de campo intentados',steals:'Robos',blocks:'Tapones',turnovers:'Pérdidas',minutes:'Minutos',pra:'Puntos + rebotes + asistencias',pr:'Puntos + rebotes',pa:'Puntos + asistencias',ra:'Rebotes + asistencias'};
export const teamStats={points:'Puntos anotados',allowed:'Puntos recibidos',threeMade:'Triples anotados',threeAttempted:'Triples intentados',rebounds:'Rebotes',assists:'Asistencias',margin:'Margen / hándicap',combined:'Puntos combinados'};
export const canary=(iso,options={})=>new Intl.DateTimeFormat('es-ES',{timeZone:'Atlantic/Canary',...options}).format(new Date(iso));
export function value(row,stat,period='full',against=false){
 const r=against?{...row,...row.opponentStats}:row;
 if(['points','allowed','margin','combined'].includes(stat)&&r.kind==='team'){
 const indices={q1:[0],q2:[1],q3:[2],q4:[3],h1:[0,1],h2:[2,3]};
 const sum=a=>indices[period]?indices[period].reduce((s,i)=>s+a[i],0):a.reduce((s,v)=>s+v,0);
 const own=sum(r.quarters),opp=sum(r.opponentQuarters);
 return stat==='points'?own:stat==='allowed'?opp:stat==='margin'?own-opp:own+opp;
 }
 if(stat==='pra')return r.points+r.rebounds+r.assists;
 if(stat==='pr')return r.points+r.rebounds;
 if(stat==='pa')return r.points+r.assists;
 if(stat==='ra')return r.rebounds+r.assists;
 return r[stat];
}
export function filterRows(rows,f={}){return rows.filter(r=>(!f.entity||r.entity===f.entity)&&(!f.venue||r.venue===f.venue)&&(!f.opponent||r.opponent===f.opponent)&&(!f.competition||r.competition===f.competition)&&(!f.seasons?.length||f.seasons.includes(r.season))).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,f.limit==='all'||!f.limit?Infinity:Number(f.limit));}
export function summarize(rows,stat,line,direction='over',period='full',against=false){
 if(!Number.isFinite(Number(line)))throw Error('La línea debe ser un número');
 const data=rows.map(r=>({...r,value:value(r,stat,period,against)})).filter(r=>Number.isFinite(r.value));
 const hits=data.filter(r=>direction==='over'?r.value>Number(line):r.value<Number(line)).length;
 const pushes=data.filter(r=>r.value===Number(line)).length;
 return {data,hits,pushes,total:data.length,percent:data.length?100*hits/data.length:0,average:data.length?data.reduce((s,r)=>s+r.value,0)/data.length:0};
}
const numeric=['points','rebounds','assists','threeMade','threeAttempted','fieldMade','fieldAttempted','steals','blocks','turnovers','minutes'];
export function validateDataset(input){
 if(!input||!Array.isArray(input.records)||!Array.isArray(input.schedule))throw Error('Se necesitan records y schedule como listas.');
 if(!input.meta||!['demo','imported','real'].includes(input.meta.mode)||!input.meta.source)throw Error('Indica meta.mode y meta.source.');
 if(input.records.length>100000)throw Error('Máximo 100.000 registros.');
 const ids=new Set();
 const records=input.records.map((r,i)=>{
 if(typeof r.id!=='string'||!r.id||ids.has(r.id))throw Error(`ID ausente o duplicado en fila ${i+1}`);ids.add(r.id);
 if(!['player','team'].includes(r.kind)||!r.entity||!r.team||!r.opponent||!r.season||!r.competition||!['home','away'].includes(r.venue)||!Number.isFinite(Date.parse(r.date)))throw Error(`Identificación inválida en fila ${i+1}`);
 const out={...r};
 for(const key of numeric){const n=Number(r[key]);if(r[key]==null||r[key]===''||!Number.isFinite(n)||n<0)throw Error(`${key} inválido en fila ${i+1}`);out[key]=n;}
 if(out.threeMade>out.threeAttempted||out.fieldMade>out.fieldAttempted||out.threeMade>out.fieldMade)throw Error(`Aciertos superiores a intentos en fila ${i+1}`);
 if(r.kind==='team'){
 if(r.entity!==r.team)throw Error(`entity de equipo no coincide con team en fila ${i+1}`);
 for(const key of ['quarters','opponentQuarters']){if(typeof out[key]==='string')out[key]=JSON.parse(out[key]);if(!Array.isArray(out[key])||out[key].length<4||out[key].some(v=>!Number.isFinite(v)||v<0))throw Error(`Cuartos inválidos en fila ${i+1}`);}
 if(out.quarters.reduce((a,b)=>a+b,0)!==out.points)throw Error(`Puntos y cuartos no coinciden en fila ${i+1}`);
 const opponentStats=typeof out.opponentStats==='string'?JSON.parse(out.opponentStats):out.opponentStats;
 if(!opponentStats||numeric.some(k=>!Number.isFinite(opponentStats[k])||opponentStats[k]<0))throw Error(`opponentStats incompleto en fila ${i+1}`);
 out.opponentStats={...opponentStats,quarters:out.opponentQuarters,opponentQuarters:out.quarters};
 }
 return out;
 });
 input.schedule.forEach(g=>{if(!g.id||!g.home||!g.away||g.home===g.away||!Number.isFinite(Date.parse(g.date)))throw Error('Partido de calendario inválido');});
 return {...input,records};
}
export function parseImport(text,name){
 if(name.toLowerCase().endsWith('.json'))return validateDataset(JSON.parse(text));
 const parsed=Papa.parse(text,{header:true,skipEmptyLines:true});if(parsed.errors.length)throw Error('CSV inválido: '+parsed.errors[0].message);
 return validateDataset({meta:{mode:'imported',source:name},schedule:[],records:parsed.data});
}
export function detectTrends(dataset,limit=20){
 const teams=new Set(dataset.schedule.flatMap(g=>[g.home,g.away]));
 const groups=new Map();dataset.records.filter(r=>teams.has(r.team)).forEach(r=>{const key=r.kind+':'+r.entity;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);});
 return [...groups.values()].flatMap(rows=>{
 const stats=rows[0].kind==='player'?['points','rebounds','assists','threeMade','pra']:['points','allowed','threeMade','rebounds','margin'];
 return stats.flatMap(stat=>{const sample=filterRows(rows,{limit});if(sample.length<5)return [];
 const sorted=sample.map(r=>value(r,stat)).sort((a,b)=>a-b);const line=Math.floor(sorted[Math.floor(sorted.length/2)])-.5;
 return ['over','under'].map(direction=>({...summarize(sample,stat,line,direction),entity:rows[0].entity,kind:rows[0].kind,team:rows[0].team,stat,line,direction}));});
 });
}
