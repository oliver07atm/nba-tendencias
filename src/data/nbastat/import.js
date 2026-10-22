import {inspectGameLink,validateGameLink} from './game-links.js';
// Pure local import boundary. Shared with future server ingestion; no HTTP or storage calls.
import {decodeNbaStatResponse} from './decoder.js';
import {prepareNbaStatGame,validateNbaStatMappings} from './updates.js';
const iso=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(v)&&Number.isFinite(Date.parse(v));
export function rejectCredentials(value){if(!value||typeof value!=='object')return;for(const [k,v]of Object.entries(value)){if(/token|authorization|credential|password|secret|api.?key/i.test(k))throw Error('El archivo contiene campos de credenciales; no se importa.');rejectCredentials(v);}}
export function readPrivateReview(value){
 rejectCredentials(value);
 if(value?.purpose!=='NBA Stat private review; NOT approved for publication'||!iso(value.receivedAt)||!value.raw)throw Error('Selecciona nbastat-private-review.json descifrado, no el paquete cifrado ni un historial.');
 const parsed=decodeNbaStatResponse(value.raw);
 return {raw:value.raw,receivedAt:value.receivedAt,parsed}; // Never trust precomputed decoded/identityChecklist/referenceChecks.
}
export function mergeNbaStatMappings(base,incoming,{aliases=new Map(),knownKeys=null,birthDates=new Map()}={}){
 rejectCredentials(incoming);validateNbaStatMappings(base);validateNbaStatMappings(incoming);
 const out={version:1,players:[],teams:[]};
 for(const field of ['players','teams']){
  const map=new Map(base[field].map(p=>[p.sourceId,p]));
  for(const item of incoming[field]){
   const old=map.get(item.sourceId);
   if(old&&Date.parse(item.checkedAt)<Date.parse(old.checkedAt))throw Error('La correspondencia importada es más antigua que la guardada.');
   if(old&&Date.parse(item.checkedAt)===Date.parse(old.checkedAt)&&JSON.stringify(old)!==JSON.stringify(item))throw Error('Correspondencias contradictorias con la misma fecha.');
   map.set(item.sourceId,structuredClone(item));
  }
  out[field]=[...map.values()];
 }
 const used=new Set();for(const p of out.players){const key=aliases.get(p.key)||p.key;if(used.has(key))throw Error('Dos IDs NBA Stat enlazan la misma identidad NBA/ESPN.');used.add(key);if(knownKeys&&!knownKeys.has(key))throw Error('La identidad seleccionada no está en tus plantillas ni históricos.');const birth=birthDates.get(key);if(birth&&birth!==p.canonicalBirthDate)throw Error('El nacimiento contradice la identidad NBA/ESPN ya revisada.');}
 return validateNbaStatMappings(out);
}
// ONLY game 1369: semantics reported as reviewed by the user, not global provider defaults.
export function previewPrivate1369(reviewFile,{date,gameLink=null,calendar=null,confirmed=false,mappings={version:1,players:[],teams:[]},mappingContext={},checkedAt=new Date().toISOString()}={}){
 const {raw,receivedAt,parsed}=readPrivateReview(reviewFile),g=parsed.game,players=parsed.players;
 if(g.sourceGameId!=='1369'||g.homeScore!==121||g.awayScore!==113||players.length!==35)throw Error('El caso revisado exige NBA Stat 1369, Detroit 121–Boston 113 y 35 registros. Otros partidos requieren su propia revisión.');
 const counts=id=>{const rows=players.filter(p=>p.teamId===id);return {total:rows.length,active:rows.filter(p=>p.observed.played===1&&p.observed.status==='ACTIVE').length,inactive:rows.filter(p=>p.observed.played===0&&p.observed.status==='INACTIVE').length};};
 const home=counts(g.homeId),away=counts(g.awayId);
 if(home.total!==18||home.active!==11||home.inactive!==7||away.total!==17||away.active!==11||away.inactive!==6)throw Error('Participación no compatible con la revisión 1369: se esperan 11 ACTIVE/1 por equipo y 13 INACTIVE/0. Valores nuevos quedan pendientes.');
 for(const p of players)if(p.observed.played===0&&(![null,''].includes(p.observed.minutes)||!String(p.observed.reason||p.observed.description||'').trim()))throw Error('DNP con minutos o motivo no revisados: NBA Stat '+p.sourceId);
 const table=players.map(p=>({sourceId:p.sourceId,name:p.name,team:p.teamId===g.homeId?'DET':'BOS',played:p.observed.played===1,points:p.stats.points,rebounds:p.stats.rebounds,assists:p.stats.assists,threeMade:p.stats.threeMade,minutes:p.observed.minutes,reason:p.observed.reason||p.observed.description||'',linked:mappings.players.some(m=>m.sourceId===p.sourceId)}));
 if(!confirmed)return {ready:false,reason:'REVIEW_REQUIRED',table,parsed};
 if(gameLink){
  validateGameLink(gameLink,calendar);
  const fresh=inspectGameLink(reviewFile,calendar,gameLink.evidence);
  if(fresh.status!=='eligible'||JSON.stringify(fresh.source)!==JSON.stringify(gameLink.source)||fresh.candidates[0]?.id!==gameLink.calendar.id)throw Error('El enlace revisado no corresponde al archivo seleccionado.');
  date=gameLink.calendar.date; // BDL reference for ordering, never an inferred NBA Stat UTC time.
 }
 if(!iso(date)||Date.parse(date)<Date.parse('2026-10-20T00:00:00Z')||Date.parse(date)>=Date.parse('2026-10-22T00:00:00Z'))throw Error('Revisa la fecha/hora UTC del partido, con formato ISO terminado en Z. No se adivina la zona de scheduled.');
 const scopedTeams={version:1,players:[],teams:[[g.homeId,'DET'],[g.awayId,'BOS']].map(([sourceId,team])=>({sourceId,team,checkedAt,sourceUrl:'https://nbastat.io/api/v1/teams/'+sourceId}))};
 // Reuse an identical reviewed team mapping instead of generating an equal-date conflict.
 scopedTeams.teams=scopedTeams.teams.filter(t=>!mappings.teams.some(old=>old.sourceId===t.sourceId&&old.team===t.team));
 if(mappings.teams.some(t=>(t.sourceId===g.homeId&&t.team!=='DET')||(t.sourceId===g.awayId&&t.team!=='BOS')))throw Error('La correspondencia de equipos contradice el partido revisado.');
 const checked=mergeNbaStatMappings(mappings,scopedTeams,mappingContext);
 const participation=[...new Map(players.map(p=>{const r={played:p.observed.played,status:p.observed.status,reason:p.observed.reason,description:p.observed.description,participated:p.observed.played===1};return [JSON.stringify(r),r];})).values()];
 const act={status:'reviewed',gameFinal:true,complete:true,evidenceUrl:'https://nbastat.io/api/v1/games/1369/boxscore',checkedAt,sourceGameId:'1369',observedGame:parsed.observed.game,date,season:'2026-27',competition:'NBA',minutesFormat:'mm:ss',dnpMinutes:[null,''],participation};
 const decoded=decodeNbaStatResponse(raw,{review:act,receivedAt,synthetic:reviewFile.synthetic===true});
 if(!decoded.ready)throw Error('Actuaciones con minutos o estadísticas incompletas; no se incorporan: '+(decoded.pending||[]).join(', '));
 const batch=prepareNbaStatGame(decoded.contract,checked,{allowPartialIdentities:true});
 return {ready:batch.ready,reason:batch.reason,table,mappings:checked,batch,parsed,pending:table.filter(p=>p.played&&!p.linked),dnp:table.filter(p=>!p.played)};
}
