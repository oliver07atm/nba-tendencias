import {validateDirectory,emptyDirectory} from './player-directory.js';
// Separate database; never opens or migrates the history or roster databases.
async function transact(mode,value){
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('nba-tendencias-player-directory',1);r.onupgradeneeded=()=>r.result.createObjectStore('corrections');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Guardado de correcciones bloqueado.'));});
 return new Promise((resolve,reject)=>{const t=db.transaction('corrections',mode),s=t.objectStore('corrections'),r=mode==='readonly'?s.get('personal'):s.put(validateDirectory(value),'personal');let result;r.onsuccess=()=>{result=r.result;};t.oncomplete=()=>{db.close();resolve(result);};t.onabort=t.onerror=()=>{db.close();reject(t.error||r.error);};});
}
export async function loadDirectory(){const value=await transact('readonly');return value?validateDirectory(value):emptyDirectory();}
export async function saveDirectory(value){validateDirectory(value);await transact('readwrite',value);return value;}
