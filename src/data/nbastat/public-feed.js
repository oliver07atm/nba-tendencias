// Static same-origin files only. No provider API, credentials, private upload or partial activation.
import {validatePublicManifest,validatePublicGame,validatePublicRelease,publicDigest,checkPublicAdvance} from './public-delivery.js';
export async function fetchPublicRelease({baseUrl,fetchImpl,previous=null,testMode=false}){
 const base=new URL(baseUrl);if(typeof window!=='undefined'&&base.origin!==window.location.origin)throw Error('PUBLIC_FEED_ORIGIN_INVALID');if(!/^https?:$/.test(base.protocol)||base.username||base.password||base.search||base.hash||!base.pathname.endsWith('/data/nbastat/'))throw Error('PUBLIC_FEED_URL_INVALID');
 async function read(path,maxBytes){const url=new URL(path,base);const response=await fetchImpl(url,{credentials:'omit',redirect:'error',cache:'no-cache',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(response.status===404?'PUBLIC_FEED_NOT_PUBLISHED':'PUBLIC_FEED_HTTP_FAILED');const text=await response.text();if(new TextEncoder().encode(text).length>maxBytes)throw Error('PUBLIC_FEED_TOO_LARGE');try{return JSON.parse(text);}catch{throw Error('PUBLIC_FEED_JSON_INVALID');}}
 const manifest=validatePublicManifest(await read('manifest.json',2*1024*1024),{testMode}),sha256=await publicDigest(manifest);
 if(previous){checkPublicAdvance(previous.manifest,manifest);if(manifest.generation===previous.manifest.generation){if(sha256!==previous.sha256)throw Error('PUBLIC_RELEASE_GENERATION_CONFLICT');return previous;}}
 const games={};for(const d of manifest.games){const old=previous?.manifest.games.find(p=>p.sourceGameId===d.sourceGameId&&p.sha256===d.sha256);const packet=old?previous.games[d.sourceGameId]:await read('games/'+d.sha256+'.json',2*1024*1024);validatePublicGame(packet,{testMode});if(packet.sourceGameId!==d.sourceGameId||packet.synthetic!==manifest.synthetic||await publicDigest(packet)!==d.sha256)throw Error('PUBLIC_GAME_CHECKSUM_MISMATCH');games[d.sourceGameId]=packet;}
 return validatePublicRelease({manifest,games,sha256},{testMode});
}
const DB='nba-tendencias-nbastat-public-feed';
function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('PUBLIC_CACHE_UNAVAILABLE'));r.onblocked=()=>reject(Error('PUBLIC_CACHE_BLOCKED'));});}
async function rawRead(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('state'),r=tx.objectStore('state').get('feed');let value;r.onsuccess=()=>{value=r.result;};tx.oncomplete=()=>{db.close();resolve(value||{version:1,revision:0,active:null,previous:null,paused:false});};tx.onabort=tx.onerror=()=>{db.close();reject(Error('PUBLIC_CACHE_READ_FAILED'));};});}
export async function loadPublicFeed({testMode=false}={}){
 const raw=await rawRead();if(raw.version!==1||!Number.isSafeInteger(raw.revision)||raw.revision<0||typeof raw.paused!=='boolean')throw Error('PUBLIC_CACHE_INVALID');let active=null,previous=null,recovered=false;
 if(raw.previous)try{previous=await validatePublicRelease(raw.previous,{testMode});}catch{}
 if(raw.active)try{active=await validatePublicRelease(raw.active,{testMode});}catch{if(!previous)throw Error('PUBLIC_CACHE_CORRUPT_NO_BACKUP');active=previous;previous=null;recovered=true;}
 return {version:1,revision:raw.revision,active,previous,paused:raw.paused||recovered,recovered};
}
async function save(snapshot,expectedRevision){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite'),s=tx.objectStore('state'),r=s.get('feed');let conflict=false;r.onsuccess=()=>{if((r.result?.revision||0)!==expectedRevision){conflict=true;tx.abort();return;}s.put({...snapshot,revision:expectedRevision+1},'feed');};tx.oncomplete=()=>{db.close();resolve({...snapshot,revision:expectedRevision+1});};tx.onabort=tx.onerror=()=>{db.close();reject(Error(conflict?'PUBLIC_CACHE_CONCURRENT_UPDATE':'PUBLIC_CACHE_WRITE_FAILED'));};});}
export async function commitPublicFeed(snapshot,release,{testMode=false}={}){
 await validatePublicRelease(release,{testMode});if(snapshot.active){await validatePublicRelease(snapshot.active,{testMode});checkPublicAdvance(snapshot.active.manifest,release.manifest);if(release.manifest.generation===snapshot.active.manifest.generation&&release.sha256!==snapshot.active.sha256)throw Error('PUBLIC_RELEASE_GENERATION_CONFLICT');}
 if(snapshot.active?.sha256===release.sha256)return snapshot;
 return save({version:1,active:release,previous:snapshot.active,paused:false},snapshot.revision);
}
export async function rollbackPublicFeed(snapshot,{testMode=false}={}){if(!snapshot.previous)throw Error('PUBLIC_CACHE_NO_PREVIOUS_RELEASE');await validatePublicRelease(snapshot.previous,{testMode});return save({version:1,active:snapshot.previous,previous:snapshot.active,paused:true},snapshot.revision);}
export async function resumePublicFeed(snapshot){return save({version:1,active:snapshot.active,previous:snapshot.previous,paused:false},snapshot.revision);}

// Explicit repair affects this PUBLIC cache only, never any original or private overlay database.
export async function repairPublicFeedCache(){await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(DB);r.onsuccess=()=>resolve();r.onerror=r.onblocked=()=>reject(Error('PUBLIC_CACHE_REPAIR_BLOCKED'));});return loadPublicFeed();}
