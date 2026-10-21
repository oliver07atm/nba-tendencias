import {mkdir,readFile,writeFile,rename,rm,chmod,realpath} from 'node:fs/promises';
import {resolve,sep,join} from 'node:path';import {fileURLToPath} from 'node:url';import {randomUUID} from 'node:crypto';
import {emptySyncState} from '../../../src/data/nbastat/sync-queue.js';
import {validateWorkerState} from './sync-worker.mjs';
import {NbaStatError} from './client.mjs';import {sealProbe,openProbe} from './sealed-probe.mjs';
const root=resolve(fileURLToPath(new URL('../../../work/',import.meta.url)));
// Durable across process restarts on THIS filesystem. No claim of persistence on ephemeral Actions runners.
export function privateSyncStore(directory=join(root,'nbastat-sync'),year=2026){
 const path=resolve(directory);if(!path.startsWith(root+sep))throw new NbaStatError('PRIVATE_STATE_PATH_REQUIRED');
 const file=join(path,'sync-state.json'),lock=join(path,'lock');let locked=false;
 const ensure=async()=>{await mkdir(path,{recursive:true,mode:0o700});if(await realpath(root)!==root||!(await realpath(path)).startsWith(root+sep))throw new NbaStatError('PRIVATE_STATE_PATH_REQUIRED');await chmod(path,0o700);};
 async function read(){if(!locked)throw new NbaStatError('WORKER_LOCK_REQUIRED');try{const value=validateWorkerState(JSON.parse(await readFile(file,'utf8')));if(value.year!==year)throw new NbaStatError('WORKER_YEAR_MISMATCH');return value;}catch(e){if(e.code==='ENOENT')return emptySyncState(year);throw new NbaStatError('PRIVATE_SYNC_STATE_UNREADABLE');}}
 return {
  withLock:async callback=>{await ensure();if(locked)throw new NbaStatError('WORKER_LOCK_BUSY');try{await mkdir(lock,{mode:0o700});}catch{throw new NbaStatError('WORKER_LOCK_BUSY');}locked=true;try{return await callback();}finally{locked=false;await rm(lock,{recursive:true});}},
  read,
  write:async(state,expectedRevision)=>{
   if(!locked)throw new NbaStatError('WORKER_LOCK_REQUIRED');validateWorkerState(state);const old=await read();if(state.revision!==expectedRevision||old.revision!==expectedRevision)throw new NbaStatError('WORKER_REVISION_CONFLICT');
   const next={...state,revision:expectedRevision+1},tmp=join(path,'state-'+randomUUID()+'.tmp');
   try{await writeFile(tmp,JSON.stringify(next),{mode:0o600,flag:'wx'});await rename(tmp,file);}finally{await rm(tmp,{force:true});}return next;
  }
 };
}
export function sealSyncCheckpoint(state,passphrase){validateWorkerState(state);return sealProbe({purpose:'NBA Stat private sync checkpoint; NOT for publication',state},passphrase);}
export function openSyncCheckpoint(envelope,passphrase){const payload=openProbe(envelope,passphrase);if(payload.purpose!=='NBA Stat private sync checkpoint; NOT for publication')throw new NbaStatError('PRIVATE_CHECKPOINT_INVALID');return validateWorkerState(payload.state);}
// Restore only into an empty isolated store: never overwrite newer or differently sourced private state.
export async function restoreSyncCheckpoint(store,envelope,passphrase){const restored=openSyncCheckpoint(envelope,passphrase);return store.withLock(async()=>{const current=await store.read();if(current.revision!==0||Object.keys(current.jobs).length||Object.keys(current.updates.games).length||current.year!==restored.year)throw new NbaStatError('RESTORE_REQUIRES_EMPTY_WORKER_STORE');return store.write({...restored,revision:0},0);});}
