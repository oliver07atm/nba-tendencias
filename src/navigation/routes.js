export const sections={Partidos:'partidos',Jugadores:'jugadores',Equipos:'equipos',Tendencias:'tendencias',Datos:'datos'};
export function readRoute(path){
 const parts=path.split('/').filter(Boolean);let id;try{id=parts[1]?decodeURIComponent(parts[1]):null;}catch{return {page:null};}
 const page=Object.keys(sections).find(k=>sections[k]===parts[0]);
 if(parts.length>2||!page||id&&!['Partidos','Jugadores','Equipos'].includes(page))return {page:null};
 return {page,id,kind:page==='Equipos'?'team':'player'};
}
export function internalMatchUrl(value){
 if(typeof value!=='string'||value.length>3000||!/^\/partidos\/[^/?#]+(?:\?[^#]*)?$/.test(value))return null;
 return readRoute(value.split('?')[0]).page==='Partidos'?value:null;
}
export function analysisFilters(search,kind='player'){
 const p=new URLSearchParams(search),get=(key,def)=>p.has(key)?p.get(key):def;
 const number=(key,def,min,max)=>{const n=Number(get(key,def));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):def;};
 const stats=kind==='team'?['points','allowed','threeMade','threeAttempted','rebounds','assists','margin','combined']:['points','rebounds','assists','threeMade','threeAttempted','fieldMade','fieldAttempted','steals','blocks','turnovers','minutes','pra','pr','pa','ra'];
 const line=get('line',kind==='team'?'109.5':'24.5');
 return {stat:stats.includes(p.get('stat'))?p.get('stat'):'points',line:line===''||Number.isFinite(Number(line))?line:kind==='team'?'109.5':'24.5',direction:get('direction','over')==='under'?'under':'over',limit:['5','10','15','20','30','50','100','150','200','300','custom','all'].includes(p.get('limit'))?p.get('limit'):'20',custom:number('custom',21,1,300000),venue:['home','away'].includes(p.get('venue'))?p.get('venue'):'',opponent:get('opponent',''),competition:get('competition',''),seasons:get('seasons','').split(',').filter(Boolean),period:['full','q1','q2','q3','q4','h1','h2'].includes(p.get('period'))?p.get('period'):'full',against:p.get('against')==='1'};
}
export function filterSearch(search,key,value){const p=new URLSearchParams(search);p.set(key,Array.isArray(value)?value.join(','):typeof value==='boolean'?value?'1':'0':String(value));return '?'+p.toString();}
