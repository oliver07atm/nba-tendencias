// Optional future Actions checkpoint adapter. Never invoked by current workflows.
// Only authenticated ciphertext is committed; the request ledger remains on its existing branch.
import {execFileSync} from 'node:child_process';
import {emptySyncState} from '../../../src/data/nbastat/sync-queue.js';
import {sealSyncCheckpoint,openSyncCheckpoint} from './sync-store.mjs';
import {validateWorkerState} from './sync-worker.mjs';
import {NbaStatError} from './client.mjs';
export function githubSyncStore({passphrase,year=2026,allowInitialize=false,git=runGit}={}){
 emptySyncState(year);
 if(typeof passphrase!=='string'||passphrase.length<32)throw new NbaStatError('PRIVATE_PASSPHRASE_REQUIRED');
 const branch='nbastat-sync-private-'+year,ref='refs/heads/'+branch;let busy=false,parent=null,value=null;
 return {
  withLock:async callback=>{
   if(busy)throw new NbaStatError('WORKER_LOCK_BUSY');busy=true;
   try{
    const remote=git(['ls-remote','--heads','origin',ref]).trim();parent=null;
    if(!remote){if(!allowInitialize)throw new NbaStatError('PRIVATE_CHECKPOINT_MISSING');value=emptySyncState(year);}
    else{
     if(!new RegExp('^[a-f0-9]{40}\\s+refs/heads/'+branch+'$').test(remote))throw new NbaStatError('PRIVATE_CHECKPOINT_REF_INVALID');
     parent=remote.split(/\s/)[0];git(['fetch','--no-tags','origin',parent]);
     try{value=openSyncCheckpoint(JSON.parse(git(['show',parent+':sync-state.sealed.json'])),passphrase);if(value.year!==year)throw Error();}catch{throw new NbaStatError('PRIVATE_CHECKPOINT_UNREADABLE');}
    }
    return await callback();
   }finally{busy=false;value=null;parent=null;}
  },
  read:async()=>{if(!busy||!value)throw new NbaStatError('WORKER_LOCK_REQUIRED');return structuredClone(value);},
  write:async(state,expectedRevision)=>{
   if(!busy||!value)throw new NbaStatError('WORKER_LOCK_REQUIRED');validateWorkerState(state);
   if(state.year!==year||state.revision!==expectedRevision||value.revision!==expectedRevision)throw new NbaStatError('WORKER_REVISION_CONFLICT');
   const next={...state,revision:expectedRevision+1},sealed=sealSyncCheckpoint(next,passphrase);
   const blob=git(['hash-object','-w','--stdin'],JSON.stringify(sealed)+'\n').trim();
   const tree=git(['mktree'],`100644 blob ${blob}\tsync-state.sealed.json\n`).trim();
   const commit=git(['-c','user.name=NBA Tendencias checkpoint','-c','user.email=checkpoint@users.noreply.github.com','commit-tree',tree,...(parent?['-p',parent]:[]),'-m','Update encrypted synchronization checkpoint']).trim();
   git(['push','--force-with-lease='+ref+':'+(parent||''),'origin',commit+':'+ref]);
   parent=commit;value=next;return structuredClone(next);
  }
 };
}
function runGit(args,input){try{return execFileSync('git',args,{input,encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:30000});}catch{throw new NbaStatError('PRIVATE_CHECKPOINT_GIT_FAILED');}}
