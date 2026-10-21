import {mkdir,readFile,writeFile,rename,rm,chmod} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {emptyLedger,NbaStatError} from './client.mjs';
const root=fileURLToPath(new URL('../../../work/',import.meta.url));
// Only the existing ignored work/ area, never public/, src/, artifacts or logs.
export function privateQuotaStore(directory=resolve(root,'nbastat-private')){
 const path=resolve(directory);if(!path.startsWith(resolve(root)+sep))throw new NbaStatError('PRIVATE_STATE_PATH_REQUIRED');
 const file=join(path,'quota.json'),lock=join(path,'lock');
 const ensure=async()=>{await mkdir(path,{recursive:true,mode:0o700});await chmod(path,0o700);};
 return {
  readLedger:async()=>{try{return JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return emptyLedger();throw new NbaStatError('QUOTA_STATE_UNREADABLE');}},
  writeLedger:async state=>{await ensure();const tmp=join(path,'quota-'+randomUUID()+'.tmp');try{await writeFile(tmp,JSON.stringify(state),{mode:0o600,flag:'wx'});await rename(tmp,file);}finally{await rm(tmp,{force:true});}},
  withLock:async callback=>{await ensure();try{await mkdir(lock,{mode:0o700});}catch(e){if(e.code==='EEXIST')throw new NbaStatError('QUOTA_LOCK_BUSY');throw new NbaStatError('QUOTA_LOCK_FAILED');}try{return await callback();}finally{await rm(lock,{recursive:true});}}
 };
}
