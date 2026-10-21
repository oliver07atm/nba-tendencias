// Prepared private overlay storage. Not loaded by the app and never stores tokens.
import {emptyNbaStatUpdates,applyNbaStatGame} from './updates.js';
const DATABASE='nba-tendencias-nbastat-private',STORE='state';
export const emptyNbaStatSnapshot=()=>({version:1,revision:0,updates:emptyNbaStatUpdates(),queue:{},cursor:null});
function validate(snapshot){
 if(!snapshot||Object.keys(snapshot).some(k=>!['version','revision','updates','queue','cursor'].includes(k))||snapshot?.version!==1||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<0||!snapshot.queue||typeof snapshot.queue!=='object'||Array.isArray(snapshot.queue)||snapshot.updates?.source!=='NBA Stat'||!snapshot.updates.games)throw Error('Estado privado NBA Stat inválido');
 for(const b of Object.values(snapshot.updates.games))applyNbaStatGame(emptyNbaStatUpdates(),b);
 return snapshot;
}
function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DATABASE,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Base NBA Stat bloqueada'));});}
export async function loadNbaStatSnapshot(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE),r=tx.objectStore(STORE).get('private');let value;r.onsuccess=()=>{value=r.result;};tx.oncomplete=()=>{db.close();try{resolve(value?validate(value):emptyNbaStatSnapshot());}catch(e){reject(e);}};tx.onabort=tx.onerror=()=>{db.close();reject(tx.error);};});}
export async function saveNbaStatSnapshot(snapshot,expectedRevision){
 validate(snapshot);if(!Number.isSafeInteger(expectedRevision)||snapshot.revision!==expectedRevision)throw Error('Revisión local inválida');
 const db=await open();return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),r=store.get('private');let conflict=false;
  r.onsuccess=()=>{if((r.result?.revision||0)!==expectedRevision){conflict=true;tx.abort();return;}store.put({...snapshot,revision:expectedRevision+1},'private');};
  tx.oncomplete=()=>{db.close();resolve(expectedRevision+1);};tx.onabort=tx.onerror=()=>{db.close();reject(Error(conflict?'Otra pestaña actualizó NBA Stat: vuelve a cargar su estado':'Guardado privado cancelado'));};
 });
}
