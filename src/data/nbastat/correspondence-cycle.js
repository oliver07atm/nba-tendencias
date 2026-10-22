// Connects evidence registry -> incremental queue -> cached validation -> existing delivery state.
// It never opens a transport, reserves quota or publishes data.
import {reconcileSyncCalendar,linkSyncGame,validateCachedSyncGames,incorporateSyncGame} from './sync-queue.js';
import {emptyCorrespondenceRegistry,mergeCorrespondenceRegistry,resolveIdentityBlocks} from './correspondence-registry.js';
import {validateGameLink,queueGameLink,inspectGameReferenceBatch,approveGameLink} from './game-links.js';
import {proposeIdentities} from './identity-proposals.js';
export function prepareCorrespondenceCycle(state,calendar,{registry=emptyCorrespondenceRegistry(),observations=[],reviewsBySourceId={},incorporate=false,testMode=false,identityResolutions={},gameReferences=[],gameEvidence=null,gameReviewConfirmed=false,approveGameSourceIds=[],syntheticGameReferences=false,checkedAt=new Date().toISOString()}={}){
 let next=reconcileSyncCalendar(state,calendar);
 let saved=mergeCorrespondenceRegistry(state.correspondences||emptyCorrespondenceRegistry(),registry);
 const proposals=proposeIdentities(observations,saved.catalog,saved.mappings);
 saved={...saved,blockedPlayers:[...new Set([...(saved.blockedPlayers||[]),...proposals.rows.filter(r=>r.status==='conflict').map(r=>r.sourceId)])]};
 saved=resolveIdentityBlocks(saved,identityResolutions);
 const allCalendar={meta:{source:'BALLDONTLIE',updatedAt:next.calendarUpdatedAt},games:Object.values(next.jobs).map(j=>j.calendar)},blocked=[];
 const gameProposals=gameReferences.length?inspectGameReferenceBatch(gameReferences,{calendar:allCalendar,evidence:gameEvidence,receivedAt:checkedAt,synthetic:syntheticGameReferences}):[];
 if(approveGameSourceIds.length){if(!gameReviewConfirmed||new Set(approveGameSourceIds).size!==approveGameSourceIds.length)throw Error('Explicit game-batch evidence review required.');const links=approveGameSourceIds.map(id=>{const p=gameProposals.find(p=>p.sourceId===id);if(!p||p.status!=='eligible')throw Error('Pending game cannot be approved in a batch.');return approveGameLink(p,{confirmed:true,checkedAt});});saved=mergeCorrespondenceRegistry(saved,{...emptyCorrespondenceRegistry(),gameLinks:links});}
 // Never let a legacy or stale link bypass the evidence registry in this orchestrator.
 next=structuredClone(next);next.correspondences=saved;
 for(const [key,j] of Object.entries(next.jobs)){
  const link=saved.gameLinks.find(l=>l.calendar.id===key);
  try{if(!link)throw Error('GAME_EVIDENCE_MISSING');validateGameLink(link,allCalendar);next=linkSyncGame(next,key,queueGameLink(link,allCalendar,{testMode}));}
  catch(e){blocked.push({calendarId:key,reason:e.message});const job=next.jobs[key];job.link=null;if(job.calendar.status==='final'){job.phase='blocked-game-link';job.hold='GAME_EVIDENCE_UNVERIFIED';} }
 }
 // Clear only holds owned by this boundary after new evidence is supplied.
 for(const j of Object.values(next.jobs))if(j.link&&j.hold==='GAME_EVIDENCE_UNVERIFIED'){j.hold=null;j.phase='finalized';j.needsDownload=!j.download;}
 const context={knownKeys:new Set(saved.catalog.map(c=>c.key)),birthDates:new Map(saved.catalog.filter(c=>c.birthDate).map(c=>[c.key,c.birthDate]))};
 for(const j of Object.values(next.jobs))if(j.download&&['validated','incorporated'].includes(j.phase)&&saved.blockedPlayers.some(id=>j.batch?.records?.some(r=>r.kind==='player'&&r.id.endsWith(':player:'+id)))){j.phase='blocked-identities';j.batch=null;}
 next=validateCachedSyncGames(next,{reviewsBySourceId,mappings:{...saved.mappings,players:saved.mappings.players.filter(p=>!saved.blockedPlayers.includes(p.sourceId))},mappingContext:context});
 if(incorporate&&!testMode)throw Error('Real incorporation is not enabled by this preparation tool.');
 if(incorporate)for(const [key,j]of Object.entries(next.jobs))if(j.phase==='validated'){if(j.batch?.synthetic!==true)throw Error('Fictitious tests cannot incorporate real statistics.');next=incorporateSyncGame(next,key);}
 return {state:next,report:{requests:0,published:0,blockedGames:blocked,gameProposals,identityProposals:proposals,blockedPlayers:saved.blockedPlayers,phases:Object.fromEntries([...new Set(Object.values(next.jobs).map(j=>j.phase))].map(p=>[p,Object.values(next.jobs).filter(j=>j.phase===p).length])),deliveryCandidates:Object.values(next.jobs).filter(j=>j.phase==='incorporated'&&!j.hold&&j.link&&next.updates.games['nbastat:game:'+j.link.sourceId]).map(j=>'nbastat:game:'+j.link.sourceId)}};
}
