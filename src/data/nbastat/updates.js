import {validNbaStatIdentityEvidence} from './identity-evidence.js';
import {validateDataset} from '../../engine.js';
import {NBA_TEAMS} from '../nba-teams.js';
import {canaryDay} from '../schedule.js';
const metrics=['points','rebounds','assists','threeMade','threeAttempted','fieldMade','fieldAttempted','steals','blocks','turnovers','minutes'];
const id=v=>typeof v==='string'&&/^[1-9]\d*$/.test(v);
const iso=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T.*Z$/.test(v)&&Number.isFinite(Date.parse(v));
const sourceUrl=v=>{try{const u=new URL(v);return u.protocol==='https:'&&u.hostname==='nbastat.io'&&!u.username&&!u.password&&!u.search&&!u.hash;}catch{return false;}};
const team=v=>NBA_TEAMS.some(t=>t.id===v);
const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
function canonicalProfile(url,key){try{const u=new URL(url),[source,,value]=key.split(':');return u.protocol==='https:'&&!u.username&&!u.password&&(source==='nba'&&['nba.com','www.nba.com'].includes(u.hostname)&&new RegExp('^/player/'+value+'(?:/|$)').test(u.pathname)||source==='espn'&&['espn.com','www.espn.com'].includes(u.hostname)&&new RegExp('/_/id/'+value+'(?:/|$)').test(u.pathname));}catch{return false;}}
export function validateNbaStatMappings(mapping){
 if(mapping?.version!==1||!Array.isArray(mapping.players)||!Array.isArray(mapping.teams))throw Error('Correspondencias NBA Stat no válidas');
 const seen=new Set(),targets=new Set();for(const p of mapping.players){
  if(!id(p.sourceId)||! /^(?:nba|espn):player:[1-9]\d*$/.test(p.key)||!date(p.birthDate)||p.canonicalBirthDate!==p.birthDate||!validNbaStatIdentityEvidence(p)||p.status!=='reviewed'||!iso(p.checkedAt)||(!sourceUrl(p.sourceUrl)||new URL(p.sourceUrl).pathname!=='/api/v1/players/'+p.sourceId)||!canonicalProfile(p.canonicalUrl,p.key)||seen.has(p.sourceId)||targets.has(p.key))throw Error('Identidad NBA Stat pendiente, duplicada o sin evidencias suficientes de IDs y nacimiento canónico');
  seen.add(p.sourceId);targets.add(p.key);
 }
 seen.clear();targets.clear();for(const t of mapping.teams){if(!id(t.sourceId)||!team(t.team)||!iso(t.checkedAt)||(!sourceUrl(t.sourceUrl)||new URL(t.sourceUrl).pathname!=='/api/v1/teams/'+t.sourceId)||seen.has(t.sourceId)||targets.has(t.team))throw Error('Equipo NBA Stat pendiente o duplicado');seen.add(t.sourceId);targets.add(t.team);}
 return mapping;
}
function stats(value){if(!value||metrics.some(k=>typeof value[k]!=='number'||!Number.isFinite(value[k])||value[k]<0||k!=='minutes'&&!Number.isInteger(value[k])))throw Error('Estadísticas incompletas; no se rellenan ausencias con cero');if(value.threeMade>value.fieldMade||value.fieldMade>value.fieldAttempted||value.threeMade>value.threeAttempted||value.threeAttempted>value.fieldAttempted||value.points<2*value.fieldMade+value.threeMade)throw Error('Tiros y puntos incoherentes');return Object.fromEntries(metrics.map(k=>[k,value[k]]));}
// This is OUR proposed internal contract, NOT the provider's JSON format.
// No network access, no IndexedDB writes, no changes to rosters/status/identities.
export function prepareNbaStatGame(contract,mapping,{allowPartialIdentities=false}={}){
 validateNbaStatMappings(mapping);
 if(contract?.contract!=='nba-tendencias-boxscore-v1'||!id(contract.sourceGameId)||!iso(contract.receivedAt)||!iso(contract.game?.date)||!/^\d{4}-\d{2}$/.test(contract.game?.season||'')||!Array.isArray(contract.players))throw Error('Contrato interno de box score inválido');
 const g=contract.game,sourceGame='nbastat:game:'+contract.sourceGameId,source=contract.synthetic===true?'DEMOSTRACIÓN FICTICIA · contrato propuesto para NBA Stat; no son datos del proveedor':'NBA Stat · https://nbastat.io';
 if(g.status!=='final'||contract.complete!==true)return {ready:false,reason:'GAME_NOT_COMPLETE',sourceGame};
 const teams=new Map(mapping.teams.map(t=>[t.sourceId,t.team])),players=new Map(mapping.players.map(p=>[p.sourceId,p]));
 const home=teams.get(g.homeId),away=teams.get(g.awayId);if(!home||!away||home===away)throw Error('Equipos no identificados');
 if(!['NBA','NBA Cup','Playoffs','Play-in','Pretemporada'].includes(g.competition)||![g.homeScore,g.awayScore].every(n=>Number.isInteger(n)&&n>=0))throw Error('Marcador o competición incompletos');
 const records=[],dnp=[],pending=[],used=new Set(),totals=new Map([[home,0],[away,0]]);
 for(const p of contract.players){
  if(!id(p.sourceId)||used.has(p.sourceId)||![g.homeId,g.awayId].includes(p.teamId))throw Error('Jugador/partido duplicado o equipo incompatible');used.add(p.sourceId);
  if(p.played===false){if(p.stats&&metrics.some(k=>p.stats[k]!=null&&p.stats[k]!==0))throw Error('DNP contradictorio con estadísticas jugadas');dnp.push({sourceId:p.sourceId,reason:typeof p.reason==='string'?p.reason:'DNP comunicado',...(typeof p.description==='string'?{description:p.description}:{})});continue;}
  if(p.played!==true){pending.push({sourceId:p.sourceId,reason:'PARTICIPATION_UNKNOWN'});continue;}
  const s=stats(p.stats),t=teams.get(p.teamId);totals.set(t,totals.get(t)+s.points);
  const identity=players.get(p.sourceId);if(!identity){pending.push({sourceId:p.sourceId,reason:'IDENTITY_UNLINKED'});continue;}
  if(typeof p.name!=='string'||!p.name.trim())throw Error('Nombre de jugador ausente');
  records.push({...s,id:sourceGame+':player:'+p.sourceId,gameId:contract.sourceGameId,kind:'player',entityId:identity.key,entity:p.name,team:t,opponent:t===home?away:home,venue:t===home?'home':'away',season:g.season,date:g.date,competition:g.competition,source,sourceGameKey:sourceGame});
 }
 if(pending.some(p=>p.reason!=='IDENTITY_UNLINKED'))return {ready:false,reason:'PENDING_PLAYERS',sourceGame,pending,dnp};
 if(totals.get(home)!==g.homeScore||totals.get(away)!==g.awayScore)throw Error('Puntos individuales y marcador no coinciden');
 if(pending.length&&(!allowPartialIdentities||!records.length))return {ready:false,reason:'PENDING_PLAYERS',sourceGame,pending,dnp};
 if(!records.length)throw Error('No hay actuaciones vinculadas');
 let teamPending=true;
 if(contract.teams!==undefined){
  if(pending.length)throw Error('No se validan totales de equipos con identidades pendientes');
  if(!Array.isArray(contract.teams)||contract.teams.length!==2||new Set(contract.teams.map(t=>t.sourceId)).size!==2)throw Error('Se necesitan ambos equipos sin duplicados');
  const byId=new Map(contract.teams.map(t=>[t.sourceId,t]));
  for(const [sourceId,t,opponentId,opponent,venue,score]of [[g.homeId,home,g.awayId,away,'home',g.homeScore],[g.awayId,away,g.homeId,home,'away',g.awayScore]]){
   const own=byId.get(sourceId),other=byId.get(opponentId);if(!own||!other)throw Error('Equipos de box score incompatibles');const s=stats(own.stats),opponentStats=stats(other.stats);
   if(s.assists>s.fieldMade)throw Error('Asistencias de equipo superiores a tiros anotados');
   if(!Array.isArray(own.quarters)||own.quarters.length<4||own.quarters.some(n=>!Number.isInteger(n)||n<0)||own.quarters.reduce((a,b)=>a+b,0)!==score||s.points!==score)throw Error('Cuartos reales ausentes o incoherentes');
   for(const k of ['points','assists','threeMade','threeAttempted','fieldMade','fieldAttempted','steals','blocks'])if(records.filter(r=>r.team===t).reduce((n,r)=>n+r[k],0)!==s[k])throw Error('Totales de jugadores y equipo incoherentes: '+k);
   records.push({...s,id:sourceGame+':team:'+sourceId,gameId:contract.sourceGameId,kind:'team',entity:t,entityId:t,team:t,opponent,venue,season:g.season,date:g.date,competition:g.competition,quarters:own.quarters,opponentQuarters:other.quarters,opponentStats,source,sourceGameKey:sourceGame});
  }
  teamPending=false;
 }
 const checked=validateDataset({meta:{mode:'imported',source:'NBA Stat · preparación privada',origin:'historical-unverified',rights:{status:'unresolved'}},records,schedule:[]});
 return {ready:true,sourceGame,receivedAt:contract.receivedAt,game:{home,away,date:g.date,season:g.season},records:structuredClone(checked.records.sort((a,b)=>a.id.localeCompare(b.id))),dnp:dnp.sort((a,b)=>a.sourceId.localeCompare(b.sourceId)),teamPending,synthetic:contract.synthetic===true,publicRedistributionAllowed:false,...(pending.length?{pendingIdentities:pending}: {})};
}
export const emptyNbaStatUpdates=()=>({version:1,source:'NBA Stat',games:{}});
const content=b=>JSON.stringify({records:b.records,dnp:b.dnp,teamPending:b.teamPending,synthetic:b.synthetic,pendingIdentities:b.pendingIdentities||[]});
export function applyNbaStatGame(state,batch){
 if(state?.version!==1||state.source!=='NBA Stat'||!state.games||Array.isArray(state.games))throw Error('Estado de actualizaciones inválido');
 if(!batch?.ready)return {state,applied:false,reason:batch?.reason||'NOT_READY'};
 if(Object.keys(batch).some(k=>!['ready','sourceGame','receivedAt','game','records','dnp','teamPending','synthetic','publicRedistributionAllowed','pendingIdentities'].includes(k)))throw Error('El lote no admite credenciales ni respuestas crudas');
 if(!/^nbastat:game:[1-9]\d*$/.test(batch.sourceGame)||!iso(batch.receivedAt)||batch.publicRedistributionAllowed!==false)throw Error('Lote privado inválido');
 validateDataset({meta:{mode:'imported',source:'NBA Stat'},records:batch.records,schedule:[]});
 if(batch.records.some(r=>!r.id.startsWith(batch.sourceGame+':')||r.sourceGameKey!==batch.sourceGame))throw Error('Namespace de partido incompatible');
 if(batch.pendingIdentities&&(!Array.isArray(batch.pendingIdentities)||batch.pendingIdentities.some(p=>!id(p.sourceId)||p.reason!=='IDENTITY_UNLINKED'||Object.keys(p).some(k=>!['sourceId','reason'].includes(k)))))throw Error('Identidades pendientes inválidas');
 const old=state.games[batch.sourceGame];
 if(old&&Date.parse(batch.receivedAt)<Date.parse(old.receivedAt))return {state,applied:false,reason:'OLDER_REVISION'};
 let enriched=false;
 if(old&&Date.parse(batch.receivedAt)===Date.parse(old.receivedAt)){
  if(content(old)===content(batch))return {state,applied:false,reason:'DUPLICATE'};
  const pending=new Set((old.pendingIdentities||[]).map(p=>p.sourceId));
  const added=batch.records.filter(r=>!old.records.some(p=>p.id===r.id));
  enriched=added.length>0&&added.every(r=>r.kind==='player'&&pending.has(r.id.split(':').at(-1)))&&old.records.every(r=>batch.records.some(n=>n.id===r.id&&JSON.stringify(n)===JSON.stringify(r)))&&JSON.stringify(old.dnp)===JSON.stringify(batch.dnp)&&JSON.stringify(old.game)===JSON.stringify(batch.game)&&old.synthetic===batch.synthetic&&old.teamPending===batch.teamPending&&(batch.pendingIdentities||[]).every(p=>pending.has(p.sourceId));
  if(!enriched)throw Error('Dos revisiones distintas con la misma fecha');
 }
 if(old&&old.records.some(r=>r.kind==='player'&&!batch.records.some(n=>n.id===r.id)&&!batch.dnp.some(p=>r.id===batch.sourceGame+':player:'+p.sourceId)))throw Error('No se pierde una actuación vinculada por una correspondencia ausente');
 if(old&&!old.teamPending&&batch.teamPending)throw Error('No se sustituye una revisión completa por otra incompleta');
 return {state:{...state,games:{...state.games,[batch.sourceGame]:structuredClone(batch)}},applied:true,reason:enriched?'IDENTITIES_LINKED':old?'REVISION':'NEW_GAME'};
}
const sourceKey=r=>r.sourceGameKey||/^(\w+:game:[^:]+):/.exec(r.id||'')?.[1];
// Requires reviewed game equivalences to avoid double counting other providers.
export function composeNbaStatView(base,state,{aliases=new Map(),gameLinks=[]}={}){
 const records=base.records.map(r=>r.kind==='player'&&aliases.has(r.entityId)?{...r,entityId:aliases.get(r.entityId)}:r),seenIds=new Set(records.map(r=>r.id)),seenGames=new Set(records.map(sourceKey).filter(Boolean)),collisions=[];let included=0;
 for(const b of Object.values(state.games)){
  if(b.synthetic!==(base.meta.mode==='demo'||base.meta.synthetic===true))throw Error('No se mezclan actualizaciones ficticias con históricos reales');
  const link=gameLinks.find(l=>l.sourceGame===b.sourceGame&&l.reviewed===true&&iso(l.checkedAt));
  const duplicate=link?.equivalentKeys?.some(k=>seenGames.has(k)),possible=records.some(r=>canaryDay(r.date)===canaryDay(b.game.date)&&new Set([r.team,r.opponent]).has(b.game.home)&&new Set([r.team,r.opponent]).has(b.game.away));
  if(duplicate||possible){collisions.push({sourceGame:b.sourceGame,reason:duplicate?'KNOWN_GAME_EXISTS':'POSSIBLE_CROSS_SOURCE_DUPLICATE'});continue;}
  const entities=new Set();
  for(const r of b.records){const key=r.kind+':'+(aliases.get(r.entityId)||r.entityId);if(entities.has(key))throw Error('Dos IDs de origen representan al mismo jugador o equipo');entities.add(key);if(seenIds.has(r.id))throw Error('Registro duplicado en la vista');seenIds.add(r.id);records.push({...r,entityId:aliases.get(r.entityId)||r.entityId});}
  seenGames.add(b.sourceGame);included++;
 }
 return {dataset:{...base,meta:included?{...base.meta,source:(base.meta.synthetic||base.meta.mode==='demo'?'DEMOSTRACIÓN FICTICIA · contrato NBA Stat':base.meta.source+' + NBA Stat · https://nbastat.io'),origin:'historical-unverified',rights:{...base.meta.rights,status:'unresolved',publicRedistributionAllowed:false},attribution:{name:'NBA Stat',url:'https://nbastat.io',synthetic:base.meta.synthetic===true||base.meta.mode==='demo'}}:base.meta,records},collisions};
}
// Simple durable queue contract: discoveries and corrections use the same source key.
export function queueNbaStatGame(queue,sourceId,notBefore){
 if(!id(sourceId)||!iso(notBefore))throw Error('Tarea de actualización inválida');
 const key='nbastat:game:'+sourceId,old=queue[key];return {...queue,[key]:{sourceId,notBefore:old&&Date.parse(old.notBefore)<Date.parse(notBefore)?old.notBefore:notBefore}};
}
export function dueNbaStatGames(queue,now=new Date(),limit=10){
 if(!Number.isFinite(Number(now))||!Number.isInteger(limit)||limit<0||limit>10)throw Error('Presupuesto de tareas inválido');
 return Object.values(queue).filter(j=>id(j.sourceId)&&iso(j.notBefore)&&Date.parse(j.notBefore)<=Number(now)).sort((a,b)=>Date.parse(a.notBefore)-Date.parse(b.notBefore)||a.sourceId.localeCompare(b.sourceId)).slice(0,limit);
}
export function finishNbaStatGame(queue,sourceId,{retryAt=null}={}){
 if(!id(sourceId)||retryAt!==null&&!iso(retryAt))throw Error('Resultado de tarea inválido');
 const next={...queue};delete next['nbastat:game:'+sourceId];return retryAt?queueNbaStatGame(next,sourceId,retryAt):next;
}
