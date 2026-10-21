import {execFileSync} from 'node:child_process';
import {emptyLedger,NbaStatError,quotaDecision} from './client.mjs';
const branch='nbastat-probe-quota',ref='refs/heads/'+branch;
// Only timestamps are committed. No response, identities or credentials enter this branch.
export function githubQuotaStore({git=runGit}={}){
 let parent=null,state=null;
 const load=()=>{
  const remote=git(['ls-remote','--heads','origin',ref]).trim();
  if(!remote){state=emptyLedger();return;}
  if(!/^[a-f0-9]{40}\s+refs\/heads\/nbastat-probe-quota$/.test(remote))throw new NbaStatError('QUOTA_REMOTE_INVALID');
  parent=remote.split(/\s/)[0];git(['fetch','--no-tags','origin',parent]);
  try{state=JSON.parse(git(['show',parent+':quota.json']));quotaDecision(state,Date.now());}catch{throw new NbaStatError('QUOTA_STATE_INVALID');}
 };
 return {
  withLock:async callback=>{if(state!==null)throw new NbaStatError('QUOTA_LOCK_BUSY');load();try{return await callback();}finally{state=null;}},
  readLedger:async()=>{if(state===null)throw new NbaStatError('QUOTA_LOCK_REQUIRED');return structuredClone(state);},
  writeLedger:async next=>{
   quotaDecision(next,Date.now());
   const safe={version:1,attempts:next.attempts,blockedUntil:next.blockedUntil};
   const blob=git(['hash-object','-w','--stdin'],JSON.stringify(safe)+'\n').trim();
   const tree=git(['mktree'],`100644 blob ${blob}\tquota.json\n`).trim();
   const commit=git(['-c','user.name=NBA Tendencias quota','-c','user.email=quota@users.noreply.github.com','commit-tree',tree,...(parent?['-p',parent]:[]),'-m','Reserve NBA Stat request quota']).trim();
   // Compare-and-swap: a competing reservation causes failure BEFORE HTTP.
   git(['push','--force-with-lease='+ref+':'+(parent||''),'origin',commit+':'+ref]);
   parent=commit;state=safe;
  }
 };
}
function runGit(args,input){try{return execFileSync('git',args,{input,encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:30000});}catch{throw new NbaStatError('QUOTA_GIT_FAILED');}}
