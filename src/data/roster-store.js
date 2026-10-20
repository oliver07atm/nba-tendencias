import {validateRosters} from './rosters.js';
// Independent database: never opens nba-tendencias-personal.
async function transact(mode,value){
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('nba-tendencias-rosters',1);r.onupgradeneeded=()=>r.result.createObjectStore('snapshots');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Guardado de plantillas bloqueado.'));});
 return new Promise((resolve,reject)=>{const t=db.transaction('snapshots',mode),s=t.objectStore('snapshots'),r=mode==='readonly'?s.get('manual'):s.put(validateRosters(value),'manual');let result;r.onsuccess=()=>{result=r.result;};t.oncomplete=()=>{db.close();resolve(result);};t.onabort=t.onerror=()=>{db.close();reject(t.error||r.error);};});
}
export async function loadRosters(){const r=await transact('readonly');return r?validateRosters(r):null;}
export async function saveRosters(value){validateRosters(value);await transact('readwrite',value);return value;}
