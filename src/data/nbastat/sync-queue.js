import {validateCorrespondenceRegistry} from './correspondence-registry.js';
// Pure, private synchronization state machine. No HTTP, timers, browser writes or publication.
import {validateSchedule,canaryDay} from '../schedule.js';
import {decodeNbaStatResponse} from './decoder.js';
import {prepareNbaStatGame,applyNbaStatGame,emptyNbaStatUpdates,validateNbaStatMappings} from './updates.js';
import {rejectCredentials,mergeNbaStatMappings} from './import.js';
export const SYNC_PHASES=['pending','finalized','downloaded','validated','incorporated','blocked-game-link','blocked-identities','blocked-validation'];
const iso=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T.*Z$/.test(v)&&Number.isFinite(Date.parse(v));
const id=v=>typeof v==='string'&&/^[1-9]\d*$/.test(v);
const calendarId=v=>typeof v==='string'&&/^bdl:game:[1-9]\d*$/.test(v);
const season=y=>y+'-'+String(y+1).slice(-2);
export function emptySyncState(year=2026){if(!Number.isInteger(year)||year<1946||year>9998)throw Error('Temporada de cola inválida');return {version:1,revision:0,year,calendarUpdatedAt:null,jobs:{},updates:emptyNbaStatUpdates(),delivery:'not-published'};}
export function validateSyncState(s){
 rejectCredentials(s);
 if(s?.version!==1||!Number.isSafeInteger(s.revision)||s.revision<0||!Number.isInteger(s.year)||s.year<1946||s.year>9998||s.delivery!=='not-published'||!s.jobs||Array.isArray(s.jobs)||s.updates?.source!=='NBA Stat'||s.calendarUpdatedAt!==null&&!iso(s.calendarUpdatedAt))throw Error('Checkpoint privado de cola inválido');
 if(Object.keys(s).some(k=>!['version','revision','year','calendarUpdatedAt','jobs','updates','delivery','correspondences'].includes(k)))throw Error('Campos de checkpoint desconocidos');
 if(s.correspondences)validateCorrespondenceRegistry(s.correspondences);
 const linked=new Set();
 for(const [key,j]of Object.entries(s.jobs)){
  if(!calendarId(key)||j.calendar?.id!==key||!SYNC_PHASES.includes(j.phase)||!iso(j.notBefore)||!Number.isSafeInteger(j.failures)||j.failures<0||typeof j.needsDownload!=='boolean')throw Error('Tarea privada inválida');
  validateSchedule({meta:{source:'BALLDONTLIE',updatedAt:j.calendar.observedAt},games:[j.calendar]});
  if(j.link){checkLink(s,j,j.link);if(linked.has(j.link.sourceId))throw Error('Correspondencia NBA Stat duplicada en el checkpoint');linked.add(j.link.sourceId);}
  if(j.download&&(!iso(j.download.receivedAt)||!id(j.download.sourceId)||!j.download.body||!/^sha256:[a-f0-9]{64}$/.test(j.download.digest)))throw Error('Descarga privada inválida');
  if(j.batch)applyNbaStatGame(emptyNbaStatUpdates(),j.batch);
 }
 for(const b of Object.values(s.updates.games))applyNbaStatGame(emptyNbaStatUpdates(),b);
 return s;
}
function calendarFields(g,at){return Object.fromEntries(['id','home','away','date','day','status','homeScore','awayScore','season','competition'].map(k=>[k,g[k]]).concat([['observedAt',g.observedAt||at]]));}
const changed=(a,b)=>['home','away','date','day','homeScore','awayScore','competition','season'].some(k=>a[k]!==b[k]);
export function reconcileSyncCalendar(state,input){
 validateSyncState(state);const calendar=validateSchedule(input);if(!calendar.meta.updatedAt)return state;
 if(state.calendarUpdatedAt&&Date.parse(calendar.meta.updatedAt)<Date.parse(state.calendarUpdatedAt))return state;
 const next=structuredClone(state);next.calendarUpdatedAt=calendar.meta.updatedAt;
 for(const g of calendar.games){
  if(g.season!==state.year&&g.season!==null)continue;
  const old=next.jobs[g.id];if(old&&Date.parse(g.observedAt||calendar.meta.updatedAt)<Date.parse(old.calendar.observedAt))continue;
  const j=old||{calendar:null,phase:'pending',needsDownload:false,notBefore:calendar.meta.updatedAt,failures:0,hold:null,lastError:null,download:null,batch:null,link:null,appliedDigest:null};
  const dirty=old&&changed(old.calendar,g);j.calendar=calendarFields(g,calendar.meta.updatedAt);
  if(j.link&&(j.link.home!==g.home||j.link.away!==g.away||canaryDay(j.link.date)!==g.day||j.link.competition!==g.competition))j.link=null;
  if(g.season===null){j.hold='SEASON_UNVERIFIED';if(!j.download)j.phase='pending';}
  else if(g.status!=='final'){j.hold='CALENDAR_NOT_FINAL';if(!old||!j.download)j.phase='pending';}
  else if(g.date===null||g.homeScore===null||g.awayScore===null){j.hold='CALENDAR_REFERENCE_INCOMPLETE';if(!old||!j.download)j.phase='blocked-game-link';}
  else{
   j.hold=null;
   if(!old||dirty||j.phase==='pending'||j.phase==='blocked-game-link'){
    // A changed matchup/date invalidates the reviewed cross-provider game link.
    if(j.link&&(j.link.home!==g.home||j.link.away!==g.away||canaryDay(j.link.date)!==g.day||j.link.competition!==g.competition))j.link=null;
    j.phase=j.link?'finalized':'blocked-game-link';j.needsDownload=true;j.batch=null;
   }
  }
  next.jobs[g.id]=j;
 }
 return next; // Never delete jobs missing from a shortened/partial calendar snapshot.
}
function checkLink(state,job,link){
 let u;try{u=new URL(link.evidenceUrl);}catch{throw Error('Correspondencia de partido sin evidencia');}
 if(link.status!=='reviewed'||link.calendarId!==job.calendar.id||!id(link.sourceId)||!iso(link.checkedAt)||!iso(link.date)||link.season!==season(state.year)||link.home!==job.calendar.home||link.away!==job.calendar.away||link.competition!==job.calendar.competition||canaryDay(link.date)!==job.calendar.day||u.origin!=='https://nbastat.io'||u.username||u.password||u.search||u.hash||!new RegExp('^/api/v1/games/'+link.sourceId+'(?:/boxscore)?$').test(u.pathname))throw Error('Correspondencia de partido pendiente o incompatible; no se equiparan IDs BDL/NBA Stat');
}
export function linkSyncGame(state,key,link){
 validateSyncState(state);const old=state.jobs[key];if(!old)throw Error('Partido fuera de la cola');checkLink(state,old,link);
 if(Object.values(state.jobs).some(j=>j.calendar.id!==key&&j.link?.sourceId===link.sourceId))throw Error('El mismo partido NBA Stat no puede enlazar dos partidos BDL');
 if(old.download&&old.download.sourceId!==link.sourceId)throw Error('Un partido descargado requiere revisión explícita antes de cambiar su ID');
 const next=structuredClone(state),j=next.jobs[key];j.link=structuredClone(link);if(!j.hold&&j.phase==='blocked-game-link'){j.phase='finalized';j.needsDownload=true;}return next;
}
export function dueSyncDownloads(state,now=new Date().toISOString(),limit=1){
 validateSyncState(state);if(!iso(now)||!Number.isInteger(limit)||limit<0||limit>10)throw Error('Presupuesto de cola inválido');
 return Object.values(state.jobs).filter(j=>!j.hold&&j.calendar.status==='final'&&j.link&&Date.parse(j.calendar.date)<=Date.parse(now)&&j.needsDownload&&['finalized','incorporated'].includes(j.phase)&&Date.parse(j.notBefore)<=Date.parse(now)).sort((a,b)=>(a.calendar.date||a.calendar.day).localeCompare(b.calendar.date||b.calendar.day)||a.calendar.id.localeCompare(b.calendar.id)).slice(0,limit).map(j=>j.calendar.id);
}
export function receiveSyncDownload(state,key,download){
 validateSyncState(state);rejectCredentials(download);const old=state.jobs[key];if(!old?.link||old.hold||old.calendar.status!=='final'||!iso(download.receivedAt)||!/^sha256:[a-f0-9]{64}$/.test(download.digest)||!download.body)throw Error('Descarga sin referencia finalizada válida');
 if(old.download&&Date.parse(download.receivedAt)<Date.parse(old.download.receivedAt))throw Error('Descarga más antigua que la conservada');
 const next=structuredClone(state),j=next.jobs[key];j.download={...structuredClone(download),sourceId:old.link.sourceId};j.batch=null;j.phase='downloaded';j.needsDownload=false;j.lastError=null;return next;
}
export function validateSyncDownload(state,key,{review,mappings,mappingContext={}}){
 validateSyncState(state);validateNbaStatMappings(mappings);mappings=mergeNbaStatMappings({version:1,players:[],teams:[]},mappings,mappingContext);const old=state.jobs[key];if(!old?.download||!old.link||old.hold||old.needsDownload)throw Error('No hay una descarga vigente para validar');
 const next=structuredClone(state),j=next.jobs[key];j.batch=null;
 try{
  const d=decodeNbaStatResponse(j.download.body,{review,receivedAt:j.download.receivedAt,synthetic:j.download.synthetic===true});
  if(!d.ready){j.phase='blocked-validation';j.lastError=d.reason;j.pending=d.pending||[];return next;}
  const g=d.contract.game,teams=new Map(mappings.teams.map(t=>[t.sourceId,t.team]));
  if(d.contract.sourceGameId!==j.link.sourceId||teams.get(g.homeId)!==j.calendar.home||teams.get(g.awayId)!==j.calendar.away||g.homeScore!==j.calendar.homeScore||g.awayScore!==j.calendar.awayScore||canaryDay(g.date)!==j.calendar.day||g.season!==season(state.year)||g.competition!==j.calendar.competition)throw Error('CALENDAR_BOX_SCORE_MISMATCH');
  const batch=prepareNbaStatGame(d.contract,mappings); // Automatic path never weakens the full-game gate for pending identities.
  if(!batch.ready){j.phase=batch.reason==='PENDING_PLAYERS'?'blocked-identities':'blocked-validation';j.pending=batch.pending||[];j.lastError=batch.reason;return next;}
  j.phase='validated';j.batch=batch;j.pending=[];j.lastError=null;return next;
 }catch(e){j.phase='blocked-validation';j.lastError=e.code||'BOX_SCORE_VALIDATION_FAILED';j.pending=[];return next;}
}
export function incorporateSyncGame(state,key){
 validateSyncState(state);const old=state.jobs[key];if(old?.phase!=='validated'||!old.batch||old.hold||old.needsDownload)throw Error('Solo se incorporan lotes validados y vigentes');
 const applied=applyNbaStatGame(state.updates,old.batch);if(!applied.applied&&applied.reason!=='DUPLICATE')throw Error('Revisión anterior retenida: '+applied.reason);
 const next=structuredClone(state);next.updates=applied.state;next.jobs[key].phase='incorporated';next.jobs[key].appliedDigest=old.download.digest;return next;
}
export function requestSyncCorrection(state,key,notBefore){
 validateSyncState(state);if(!iso(notBefore)||!state.jobs[key]?.link)throw Error('Revisión sin partido enlazado');
 const next=structuredClone(state),j=next.jobs[key];j.needsDownload=true;j.notBefore=notBefore;j.phase='finalized';j.batch=null;return next;
}

// Revisit cached identity/schema blocks locally. No transport, no quota consumption.
export function validateCachedSyncGames(state,{reviewsBySourceId={},mappings,mappingContext={}}){
 let next=state;for(const [key,j]of Object.entries(state.jobs))if(j.download&&!j.hold&&!j.needsDownload&&['downloaded','blocked-identities','blocked-validation'].includes(j.phase))next=validateSyncDownload(next,key,{review:reviewsBySourceId[j.link?.sourceId],mappings,mappingContext});return next;
}
