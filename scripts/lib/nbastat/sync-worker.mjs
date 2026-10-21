// Inert library: no executable entrypoint, cron, module-level HTTP or publication.
import {createHash} from 'node:crypto';
import {createNbaStatClient,assertNbaStatReady,quotaDecision,HOUR,NbaStatError} from './client.mjs';
import {validateSyncState,dueSyncDownloads,receiveSyncDownload} from '../../../src/data/nbastat/sync-queue.js';
export const responseDigest=body=>'sha256:'+createHash('sha256').update(JSON.stringify(body)).digest('hex');
export function validateWorkerState(state){validateSyncState(state);for(const j of Object.values(state.jobs))if(j.download&&responseDigest(j.download.body)!==j.download.digest)throw new NbaStatError('PRIVATE_CACHE_DIGEST_MISMATCH');return state;}
export async function runOneSyncDownload({config,store,quotaStore,token,fetchImpl,clock=()=>Date.now(),synthetic=false}){
 if(config?.enabled!==true)return {status:'disabled',requests:0};
 assertNbaStatReady(config,'ingestion');
 if(typeof fetchImpl!=='function')throw new NbaStatError('EXPLICIT_SERVER_TRANSPORT_REQUIRED'); // Published config is disabled AND wire semantics remain unverified.
 if(!store||![store.withLock,store.read,store.write].every(f=>typeof f==='function'))throw new NbaStatError('DURABLE_WORKER_STORAGE_REQUIRED');
 return store.withLock(async()=>{
  const state=validateWorkerState(await store.read());if(state.year!==(config.seasonYear??2026))throw new NbaStatError('SOURCE_SEASON_SCOPE_MISMATCH');const now=new Date(clock()).toISOString(),key=dueSyncDownloads(state,now,1)[0];
  if(!key)return {status:'idle',requests:0};
  const client=createNbaStatClient({config,token,...quotaStore,fetchImpl,clock});
  let result;
  try{result=await client.boxScore(state.jobs[key].link.sourceId);}
  catch(e){
   const code=e instanceof NbaStatError?e.code:'DOWNLOAD_FAILED';
   // Quota persistence/locks are fail-closed: do not paper over an uncertain reservation.
   if(!/^(?:HTTP_\d+|NETWORK|INVALID_JSON)$/.test(code))throw e;
   const next=structuredClone(state),j=next.jobs[key];j.failures++;j.lastError=code;
   let delay=clock()+Math.min(HOUR,60000*2**Math.min(j.failures-1,6));
   if(code==='HTTP_429'){
    delay=clock()+HOUR;
    try{const q=await quotaStore.withLock(async()=>quotaDecision(await quotaStore.readLedger(),clock()));delay=Math.max(delay,q.notBefore);}catch{} // Never clears/rewrites the quota ledger.
   }
   j.notBefore=new Date(delay).toISOString();await store.write(next,state.revision);
   return {status:'retry-pending',key,code,notBefore:j.notBefore};
  }
  if(result.deferred){const next=structuredClone(state);next.jobs[key].notBefore=new Date(result.notBefore).toISOString();next.jobs[key].lastError='QUOTA_DEFERRED';await store.write(next,state.revision);return {status:'deferred',requests:0,key,notBefore:next.jobs[key].notBefore};}
  const raw=JSON.stringify(result.body);let next;
  try{if(raw.includes(token))throw new NbaStatError('PRIVATE_RESPONSE_CONTAINS_CREDENTIAL');next=receiveSyncDownload(state,key,{receivedAt:new Date(clock()).toISOString(),body:result.body,digest:responseDigest(result.body),synthetic});}
  catch{const blocked=structuredClone(state);blocked.jobs[key].phase='blocked-validation';blocked.jobs[key].needsDownload=true;blocked.jobs[key].lastError='RESPONSE_NOT_SAFE_TO_CACHE';await store.write(blocked,state.revision);return {status:'blocked-validation',requests:1,key};}

  // A crash after HTTP but before this write keeps the old job and the consumed reservation.
  // A future retry may re-download, but stable IDs prevent duplicate incorporated rows.
  await store.write(next,state.revision);return {status:'downloaded',requests:1,key};
 });
}
