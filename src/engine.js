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
export const entityKey=r=>r.entityId||r.entity;
export function entityOptions(rows,kind){
 const map=new Map();
 for(const row of [...rows].sort((a,b)=>new Date(b.date)-new Date(a.date))){
  if(row.kind!==kind)continue;
  const id=entityKey(row);if(!map.has(id))map.set(id,{id,label:row.entity,team:row.team});
 }
 const values=[...map.values()];const counts=new Map();values.forEach(v=>counts.set(v.label,(counts.get(v.label)||0)+1));
 return values.map(v=>({...v,label:counts.get(v.label)>1?`${v.label} · ${v.team}`:v.label})).sort((a,b)=>a.label.localeCompare(b.label,'es'));
}
export function filterRows(rows,f={}){return rows.filter(r=>(!f.entity||entityKey(r)===f.entity)&&(!f.venue||r.venue===f.venue)&&(!f.opponent||r.opponent===f.opponent)&&(!f.competition||r.competition===f.competition)&&(!f.seasons?.length||f.seasons.includes(r.season))).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,f.limit==='all'||!f.limit?Infinity:Number(f.limit));}
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
 if(input.records.length>300000)throw Error('Máximo 300.000 registros.');
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
export function quantile(sorted,q){
 if(!sorted.length)return null;
 const position=(sorted.length-1)*q,lo=Math.floor(position),hi=Math.ceil(position);
 return sorted[lo]+(sorted[hi]-sorted[lo])*(position-lo);
}
export function trendLines(values,{signed=false}={}){
 const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
 if(!sorted.length||sorted.every(v=>v===0)||!signed&&sorted.filter(v=>v===0).length/sorted.length>=.9)return [];
 const median=quantile(sorted,.5),scale=Math.max(1,quantile(sorted,.75)-quantile(sorted,.25),Math.abs(median)*.2);
 const lines=new Set();
 for(const q of [.2,.35,.5,.65,.8]){
  const center=Math.floor(quantile(sorted,q));
  for(const line of [center-.5,center+.5])if((signed||line>=.5&&line>=median*.5&&line<=Math.max(median*1.5,median+1))&&1/(1+Math.abs(line-median)/scale)>=.55)lines.add(line);
 }
 return [...lines].sort((a,b)=>a-b);
}
export function wilsonLower(hits,total){
 if(!total)return 0;
 const z=1.96,p=hits/total,z2=z*z;
 return (p+z2/(2*total)-z*Math.sqrt(p*(1-p)/total+z2/(4*total*total)))/(1+z2/total);
}
// Descriptive ranking only: this score is neither a win probability nor an EV.
export function trendQuality(hits,total,line,median,scale){
 const centrality=1/(1+Math.abs(line-median)/scale),support=total/(total+20),lower=wilsonLower(hits,total);
 return {quality:100*lower*support*centrality,centrality,support,wilson:lower};
}
export function oddsMetrics({odds='',estimatedProbability='',minOdds=1.2}={}){
 const missing=v=>v==null||String(v).trim()==='';
 const minimum=Number(minOdds),o=missing(odds)?null:Number(odds),p=missing(estimatedProbability)?null:Number(estimatedProbability);
 if(!Number.isFinite(minimum)||minimum<1.2)throw Error('La cuota mínima debe ser al menos 1,20.');
 if(o!==null&&(!Number.isFinite(o)||o<minimum))throw Error('La cuota debe ser igual o superior al mínimo configurado.');
 if(p!==null&&(!Number.isFinite(p)||p<0||p>100))throw Error('La probabilidad estimada debe estar entre 0 y 100 %.');
 return {odds:o,estimatedProbability:p,impliedProbability:o===null?null:100/o,fairOdds:p===null?null:p===0?Infinity:100/p,expectedValue:o===null||p===null?null:o*p/100-1};
}
export function detectTrends(dataset,limit=20,{currentTeams=null,excludedPlayers=new Set(),stats=null,kind='',venue='',opponent='',competition='',seasons=[],team='',player='',matchId='',minPercent=0}={}){
 const schedule=matchId?dataset.schedule.filter(g=>g.id===matchId):dataset.schedule,teams=new Set(schedule.flatMap(g=>[g.home,g.away]));
 const groups=new Map();
 for(const r of dataset.records){
  if(kind&&r.kind!==kind)continue;
  const key=r.kind+':'+entityKey(r);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);
 }
 const results=[];
 for(const rows of groups.values()){
  const first=rows[0],key=entityKey(first);
  if(first.kind==='player'&&(excludedPlayers.has(key)||player&&player!==key)||player&&first.kind!=='player')continue;
  const associatedTeam=first.kind==='player'&&currentTeams?currentTeams.get(key):[...rows].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))[0].team;
  if(!associatedTeam||!teams.has(associatedTeam)||team&&associatedTeam!==team)continue;
  const filtered=filterRows(rows,{venue,opponent,competition,seasons,limit:'all'});
  const allowed=first.kind==='player'?playerStats:teamStats;
  for(const stat of stats||Object.keys(allowed)){
   if(!Object.hasOwn(allowed,stat))continue;
   const all=filtered.map(row=>({row,value:value(row,stat)})).filter(p=>Number.isFinite(p.value));
   const sample=limit==='all'?all:all.slice(0,Math.max(1,Number(limit)||20));
   if(sample.length<5)continue;
   const values=sample.map(p=>p.value),sorted=[...values].sort((a,b)=>a-b),median=quantile(sorted,.5),average=values.reduce((s,v)=>s+v,0)/values.length,scale=Math.max(1,quantile(sorted,.75)-quantile(sorted,.25),Math.abs(median)*.2);
   const lines=trendLines(values,{signed:stat==='margin'}),candidates=[];
   // Share a compact chart among candidate lines. Full samples remain in the
   // original dataset and in the individual chart; no historical row is edited.
   const data=sample.slice(0,20).map(p=>({...p.row,value:p.value}));
   for(const line of lines)for(const direction of ['over','under']){
    const hit=v=>direction==='over'?v>line:v<line,hits=values.filter(hit).length,percent=100*hits/values.length;
    if(!hits||percent<Number(minPercent))continue;
    const windows=[5,10,15,20].map(requested=>{const recent=all.slice(0,requested),hits=recent.filter(p=>hit(p.value)).length;return {requested,hits,total:recent.length,percent:recent.length?100*hits/recent.length:0};});
    candidates.push({entity:first.entity,entityId:key,kind:first.kind,team:associatedTeam,stat,line,direction,hits,total:values.length,percent,pushes:values.filter(v=>v===line).length,average,median,available:all.length,windows,data,candidateCount:lines.length*2,...trendQuality(hits,values.length,line,median,scale)});
   }
   // Limit repeated lines per entity/statistic without letting raw percentage
   // choose them. Filters are applied before this selection.
   candidates.sort((a,b)=>b.quality-a.quality||b.total-a.total||a.line-b.line||a.direction.localeCompare(b.direction));
   results.push(...candidates.slice(0,4));
  }
 }
 return results;
}
