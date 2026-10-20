import Papa from 'papaparse';
import {validateDataset} from '../engine.js';

// ESPN franchise IDs, not display abbreviations: this excludes All-Star teams.
export const nbaTeams = Object.freeze(Object.fromEntries([
 ['1','ATL'],['2','BOS'],['3','NOP'],['4','CHI'],['5','CLE'],['6','DAL'],
 ['7','DEN'],['8','DET'],['9','GSW'],['10','HOU'],['11','IND'],['12','LAC'],
 ['13','LAL'],['14','MIA'],['15','MIL'],['16','MIN'],['17','BKN'],['18','NYK'],
 ['19','ORL'],['20','PHI'],['21','PHX'],['22','POR'],['23','SAC'],['24','SAS'],
 ['25','OKC'],['26','UTA'],['27','WAS'],['28','TOR'],['29','MEM'],['30','CHA']
]));
const competitions={2:'Temporada regular',3:'Playoffs',5:'Play-in'};
const fields={points:'points',rebounds:'rebounds',assists:'assists',threeMade:'three_point_field_goals_made',threeAttempted:'three_point_field_goals_attempted',fieldMade:'field_goals_made',fieldAttempted:'field_goals_attempted',steals:'steals',blocks:'blocks',turnovers:'turnovers',minutes:'minutes'};
const clean=v=>typeof v==='string'?v.trim():v;
const missing=v=>v==null||['','NA','N/A','null','nan','NaN'].includes(clean(v));
const yes=v=>v===true||String(v).toLowerCase()==='true';
export function readHooprCsv(text){
 if(typeof text!=='string'||!text.trim())throw Error('El CSV está vacío.');
 const result=Papa.parse(text,{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.replace(/^\uFEFF/,'').trim()});
 if(result.errors.length)throw Error('CSV hoopR inválido: '+result.errors[0].message);
 return result.data;
}
export function seasonLabel(endingYear){
 const year=Number(endingYear);
 if(!Number.isInteger(year)||year<1947||year>2100)throw Error('Año final de temporada inválido');
 return `${year-1}-${String(year).slice(-2)}`;
}
function number(v,label){
 if(missing(v)||typeof v==='boolean')throw Error(`${label} ausente`);
 const n=Number(v);if(!Number.isFinite(n)||n<0)throw Error(`${label} inválido`);
 return n;
}
export function parseMinutes(v){
 if(typeof v==='string'&&/^\d+:\d{2}$/.test(v.trim())){
 const [m,s]=v.trim().split(':').map(Number);if(s>=60)throw Error('Segundos inválidos');return m+s/60;
 }
 return number(v,'minutes');
}
export function parseLinescores(raw){
 let list=raw;
 if(typeof raw==='string'){
  try{list=JSON.parse(raw);}catch{
   // Some CSV assets contain NumPy/Python repr: adjacent dictionaries, single
   // quotes, optional commas. Parse ONLY this literal grammar, never eval.
   const text=raw.trim();if(!text.startsWith('[')||!text.endsWith(']'))throw Error('linescores inválido');
   const body=text.slice(1,-1);const objects=[...body.matchAll(/\{([^{}]*)\}/g)];
   if(!objects.length||body.replace(/\{[^{}]*\}/g,'').replace(/[\s,]/g,''))throw Error('linescores no reconocido');
   list=objects.map(match=>{
    const obj={};let rest=match[1];
    while(rest.trim()){
     const m=rest.match(/^\s*['"](value|displayValue|period)['"]\s*:\s*(?:['"]([^'"]*)['"]|(-?\d+(?:\.\d+)?))\s*(,\s*|$)/);
     if(!m||Object.hasOwn(obj,m[1]))throw Error('Literal linescores no reconocido');
     obj[m[1]]=m[2]??Number(m[3]);rest=rest.slice(m[0].length);
    }
    return obj;
   });
  }
 }
 if(!Array.isArray(list)||list.length<4)throw Error('Faltan cuartos');
 const values=list.map((x,i)=>typeof x==='number'?{period:i+1,value:x}:x).sort((a,b)=>Number(a.period)-Number(b.period));
 return values.map((x,i)=>{
  if(Number(x.period)!==i+1)throw Error('Periodos duplicados o incompletos');
  const n=number(x.value,'Puntos del cuarto');if(!Number.isInteger(n))throw Error('Puntos de cuarto no enteros');return n;
 });
}
function unique(rows,key,label){
 const map=new Map();for(const row of rows){const id=key(row);if(map.has(id)){
  if(JSON.stringify(map.get(id))!==JSON.stringify(row))throw Error(`${label} duplicado conflictivo: ${id}`);
 }else map.set(id,row);}return map;
}
function stats(row,team=false,periods=4){
 return Object.fromEntries(Object.entries(fields).map(([target,source])=>{
  if(team&&target==='minutes')return [target,240+25*Math.max(0,periods-4)];
  if(team&&target==='points')source='team_score';
  if(team&&target==='rebounds')source='total_rebounds';
  // ESPN turnovers are committed by players; team_turnovers is separate.
  // Use total_turnovers for the team, and retain source provenance.
  if(team&&target==='turnovers')source='total_turnovers';
  return [target,target==='minutes'?parseMinutes(row[source]):number(row[source],source)];
 }));
}
export function convertHoopr({players,teams,schedule}){
 if(![players,teams,schedule].every(Array.isArray))throw Error('Se necesitan jugadores, equipos y calendario');
 const report={input:{players:players.length,teams:teams.length,schedule:schedule.length},excluded:{nonNbaGames:0,incompleteGames:0,dnp:0,missingPlayerStats:0,unmatchedPlayers:0},issues:[],issuesCount:0};
 const issue=(id,message)=>{report.issuesCount++;if(report.issues.length<30)report.issues.push({gameId:id,message});};
 const schedules=unique(schedule,r=>String(r.game_id||r.id),'Partido');
 const teamRows=unique(teams,r=>`${r.game_id}:${r.team_id}`,'Equipo/partido');
 const playerRows=unique(players,r=>`${r.game_id}:${r.athlete_id}`,'Jugador/partido');
 const records=[],games=new Map(),teamInfo=new Map();
 for(const [gameId,g] of schedules){
  const home=nbaTeams[String(g.home_id)],away=nbaTeams[String(g.away_id)];
  if(!home||!away||home===away||!competitions[Number(g.season_type)]){report.excluded.nonNbaGames++;continue;}
  if(!yes(g.status_type_completed)){report.excluded.incompleteGames++;continue;}
  try{
   const season=seasonLabel(g.season),competition=competitions[Number(g.season_type)];
   if(!/T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(g.date)||!Number.isFinite(Date.parse(g.date)))throw Error('Fecha sin zona horaria');
   const date=new Date(g.date).toISOString();
   const h=teamRows.get(`${gameId}:${g.home_id}`),a=teamRows.get(`${gameId}:${g.away_id}`);
   if(!h||!a)throw Error('Falta box score de uno de los equipos');
   const hq=parseLinescores(g.home_linescores),aq=parseLinescores(g.away_linescores);
   if(hq.length!==aq.length)throw Error('Periodos incompatibles');
   const hs=stats(h,true,hq.length),as=stats(a,true,aq.length);
   if(hq.reduce((s,n)=>s+n,0)!==hs.points||aq.reduce((s,n)=>s+n,0)!==as.points||number(g.home_score,'home_score')!==hs.points||number(g.away_score,'away_score')!==as.points)throw Error('Marcador y cuartos no coinciden');
   for(const row of [h,a])if(String(row.season)!==String(g.season)||Number(row.season_type)!==Number(g.season_type))throw Error('Temporada del box score incompatible');
   const batch=[[h,home,away,'home',hq,aq,hs,as],[a,away,home,'away',aq,hq,as,hs]].map(([r,team,opponent,venue,quarters,opponentQuarters,s,opponentStats])=>({
    ...s,id:`espn:game:${gameId}:team:${r.team_id}`,gameId,sourceGameId:gameId,kind:'team',entity:team,entityId:team,team,opponent,venue,season,competition,date,quarters,opponentQuarters,opponentStats
   }));
   validateDataset({meta:{mode:'imported',source:'Revisión local'},records:batch,schedule:[]});
   records.push(...batch);games.set(gameId,{id:gameId,home,away,date,season,competition,status:'completed',source:'ESPN vía SportsDataverse'});
   for(const r of [h,a])teamInfo.set(nbaTeams[r.team_id],{id:nbaTeams[r.team_id],name:r.team_display_name||nbaTeams[r.team_id]});
  }catch(e){report.excluded.incompleteGames++;issue(gameId,e.message);}
 }
 for(const r of playerRows.values()){
  if(yes(r.did_not_play)){report.excluded.dnp++;continue;}
  const gameId=String(r.game_id),g=games.get(gameId),team=nbaTeams[r.team_id];
  if(!g||![g.home,g.away].includes(team)){report.excluded.unmatchedPlayers++;continue;}
  try{
   if(missing(r.athlete_id)||missing(r.athlete_display_name)||!['false',false].includes(r.did_not_play))throw Error('Identidad o DNP desconocido');
   if(seasonLabel(r.season)!==g.season||competitions[Number(r.season_type)]!==g.competition)throw Error('Temporada de jugador incompatible');
   const out={...stats(r),id:`espn:game:${gameId}:player:${r.athlete_id}`,gameId,sourceGameId:gameId,kind:'player',entity:r.athlete_display_name,entityId:`espn:player:${r.athlete_id}`,team,opponent:team===g.home?g.away:g.home,venue:team===g.home?'home':'away',season:g.season,competition:g.competition,date:g.date};
   validateDataset({meta:{mode:'imported',source:'Revisión local'},records:[out],schedule:[]});records.push(out);
  }catch(e){report.excluded.missingPlayerStats++;issue(gameId,`${r.athlete_id}: ${e.message}`);}
 }
 const dataset=validateDataset({meta:{mode:'imported',origin:'historical-unverified',source:'ESPN vía SportsDataverse · procedencia declarada, derechos y precisión sin verificar',rights:{status:'unresolved',repositoryLicense:'CC-BY-4.0 / MIT (alcances distintos)',upstream:'ESPN',upstreamTerms:'https://disneytermsofuse.com/english/'},accuracy:{status:'unverified'},coverage:{seasons:[...new Set(records.map(r=>r.season))].sort(),teams:teamInfo.size}},teams:[...teamInfo.values()],schedule:[],records:records.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id))});
 // Historical completed games are not the next-game calendar used by trends.
 report.output={records:records.length,players:records.filter(r=>r.kind==='player').length,teams:teamInfo.size,games:games.size,seasons:dataset.meta.coverage.seasons};
 return {dataset,report};
}
export function mergeHistoricalDatasets(datasets){
 if(!datasets.length)throw Error('No hay conjuntos para combinar');
 const modes=new Set(datasets.map(d=>d.meta.mode));
 if(modes.size!==1||modes.has('demo'))throw Error('No se permite mezclar demostración con históricos');
 datasets.forEach(validateDataset);
 const records=[...unique(datasets.flatMap(d=>d.records),r=>r.id,'Registro histórico').values()];
 const schedule=[...unique(datasets.flatMap(d=>d.schedule),g=>g.id,'Partido de calendario').values()];
 return validateDataset({meta:{...datasets[0].meta,mode:'imported',accuracy:{status:'unverified'},rights:{...datasets[0].meta.rights,status:'unresolved'},coverage:{seasons:[...new Set(records.map(r=>r.season))].sort(),teams:new Set(records.map(r=>r.team)).size}},teams:[...new Map(datasets.flatMap(d=>d.teams||[]).map(t=>[t.id,t])).values()],schedule,records:records.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id))});
}
