import {asUnverifiedHistory} from './local-history.js';
const DB_NAME='nba-tendencias-personal',STORE='history',KEY='personal';
export function storageError(error){
 if(error?.name==='QuotaExceededError')return 'No hay espacio suficiente en este navegador. Los datos siguen en esta sesión: exporta el JSON como copia de seguridad.';
 return 'No se pudo acceder al guardado local. Puede estar bloqueado o limitado en navegación privada. Los datos de esta sesión se pueden exportar como JSON.';
}
function openDB(){
 return new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(Error('IndexedDB no disponible'));return;}
  const req=globalThis.indexedDB.open(DB_NAME,1);let abandoned=false;
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
  req.onerror=()=>reject(req.error);
  req.onblocked=()=>{abandoned=true;reject(Error('Cierra otras pestañas de NBA Tendencias y vuelve a intentarlo.'));};
  req.onsuccess=()=>{if(abandoned){req.result.close();return;}const db=req.result;db.onversionchange=()=>db.close();resolve(db);};
 });
}
async function transaction(mode,operation){
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  let tx;try{tx=db.transaction(STORE,mode);const req=operation(tx.objectStore(STORE));let value;
   req.onsuccess=()=>{value=req.result;};
   tx.oncomplete=()=>{db.close();resolve(value);};
   tx.onabort=tx.onerror=()=>{db.close();reject(tx.error||req.error||Error('Transacción cancelada'));};
  }catch(error){db.close();reject(error);}
 });
}
export async function loadHistory(){
 const saved=await transaction('readonly',store=>store.get(KEY));
 if(!saved)return null;
 if(saved.version!==1||!saved.dataset)throw Error('Formato de historial guardado no compatible.');
 const dataset=asUnverifiedHistory(saved.dataset);
 if(dataset.meta.mode==='demo')throw Error('La copia guardada no es un histórico personal.');
 return {...saved,dataset};
}
export async function saveHistory(dataset,{active=true,report=null}={}){
 const checked=asUnverifiedHistory(dataset);
 if(checked.meta.mode==='demo')throw Error('La demostración no se guarda como histórico personal.');
 const snapshot={version:1,active,dataset:checked,report,savedAt:new Date().toISOString()};
 await transaction('readwrite',store=>store.put(snapshot,KEY));return snapshot;
}
export async function setHistoryActive(active){
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),req=store.get(KEY);
  req.onsuccess=()=>{if(req.result)store.put({...req.result,active},KEY);};
  tx.oncomplete=()=>{db.close();resolve();};
  tx.onabort=tx.onerror=()=>{db.close();reject(tx.error||req.error||Error('Transacción cancelada'));};
 });
}
export async function deleteHistory(){await transaction('readwrite',store=>store.delete(KEY));}
