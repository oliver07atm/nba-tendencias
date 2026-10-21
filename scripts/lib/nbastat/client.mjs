// Server-side only. Never import this module from src/ or a browser worker.
export const NBASTAT_ORIGIN='https://nbastat.io';
export const HOUR=60*60*1000;
import {NbaStatError} from '../../../src/data/nbastat/errors.js';
export {NbaStatError};
export function assertNbaStatReady(config,purpose='ingestion'){
 if(!['ingestion','private-inspection'].includes(purpose)||config?.enabled!==true||config.personalPermission!=='confirmed'||!['confirmed','denied'].includes(config.publicJsonPermission)||config.season2026Coverage!=='confirmed'||purpose!=='private-inspection'&&config.responseSchema!=='verified'||config.mode!=='private-only')throw new NbaStatError('INTEGRATION_DISABLED_PENDING_REVIEW');
}
export function emptyLedger(){return {version:1,attempts:[],blockedUntil:0};}
function checkedLedger(value){
 if(value?.version!==1||!Array.isArray(value.attempts)||value.attempts.some(n=>!Number.isSafeInteger(n)||n<0)||!Number.isSafeInteger(value.blockedUntil)||value.blockedUntil<0)throw new NbaStatError('QUOTA_STATE_INVALID');
 return value;
}
export function quotaDecision(value,now){
 const state=checkedLedger(value),attempts=state.attempts.filter(n=>n>now-HOUR);
 const next=Math.max(state.blockedUntil,attempts.length>=10?Math.min(...attempts)+HOUR:now);
 return {allowed:next<=now,notBefore:next,state:{version:1,attempts,blockedUntil:state.blockedUntil}};
}
// read/write must use durable private storage under a SINGLE external lock.
// There is no in-process-only quota reset and no automatic retry on 429.
export function createNbaStatClient({config,token,readLedger,writeLedger,withLock,fetchImpl=fetch,clock=()=>Date.now(),purpose='ingestion'}){
 const get=async path=>{
  assertNbaStatReady(config,purpose);
  if(typeof window!=='undefined'||typeof process==='undefined'||!process.versions?.node)throw new NbaStatError('SERVER_ONLY');
  if(typeof token!=='string'||!token.trim()||/[\r\n]/.test(token))throw new NbaStatError('TOKEN_MISSING_OR_INVALID');
  if(![readLedger,writeLedger,withLock].every(f=>typeof f==='function'))throw new NbaStatError('DURABLE_QUOTA_STORAGE_REQUIRED');
  return withLock(async()=>{
   const now=clock(),decision=quotaDecision(await readLedger(),now);
   if(!decision.allowed)return {deferred:true,notBefore:decision.notBefore};
   // Commit the reservation BEFORE HTTP, including failed requests/timeouts.
   await writeLedger({...decision.state,attempts:[...decision.state.attempts,now]});
   let response;try{response=await fetchImpl(new URL(path,NBASTAT_ORIGIN),{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(20000)});}catch{throw new NbaStatError('NETWORK');}
   const retry=response.headers.get('Retry-After'),remaining=response.headers.get('RateLimit-Remaining');
   if(response.status===429||remaining==='0'){
    const current=checkedLedger(await readLedger()),seconds=retry!==null&&/^\d+$/.test(retry)?Number(retry):null;
    // Reset header units are not specified in the public docs. Do not guess.
    const retryAt=seconds===null?Date.parse(retry||''):clock()+seconds*1000;
    await writeLedger({...current,blockedUntil:Math.max(current.blockedUntil,clock()+HOUR,Number.isFinite(retryAt)?retryAt:0)});
   }
   if(!response.ok)throw new NbaStatError('HTTP_'+response.status);
   try{return {deferred:false,body:await response.json()};}catch{throw new NbaStatError('INVALID_JSON');}
  });
 };
 const day=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 const id=n=>{if(!/^[1-9]\d*$/.test(String(n)))throw new NbaStatError('INVALID_SOURCE_ID');return String(n);};
 return {players:({page=1,teamId=null}={})=>{if(!Number.isSafeInteger(page)||page<1)throw new NbaStatError('INVALID_DISCOVERY_QUERY');const p=new URLSearchParams({page:String(page),per_page:'100'});if(teamId!==null)p.set('team_id',id(teamId));return get('/api/v1/players?'+p);},boxScore:gameId=>get('/api/v1/games/'+id(gameId)+'/boxscore'),player:playerId=>get('/api/v1/players/'+id(playerId)),teams:()=>get('/api/v1/teams'),games:({season,dateFrom,dateTo,page=1}={})=>{if(!/^\d{4}-\d{2}$/.test(season||'')||![dateFrom,dateTo].every(day)||dateFrom>dateTo||!Number.isSafeInteger(page)||page<1)throw new NbaStatError('INVALID_DISCOVERY_QUERY');const p=new URLSearchParams({season,date_from:dateFrom,date_to:dateTo,status:'Final',order:'asc',per_page:'100',page:String(page)});return get('/api/v1/games?'+p);}};
}
// Structural decoding is available; value semantics still require an explicit per-game review.
export {decodeNbaStatResponse} from './decoder.mjs';
