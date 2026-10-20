import {entityKey,entityOptions} from '../engine.js';
export const emptyDirectory=()=>({version:1,type:'nba-player-corrections',identities:[],statuses:[]});
const id=v=>typeof v==='string'&&/^[1-9]\d*$/.test(v);
const iso=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T.*Z$/.test(v)&&Number.isFinite(Date.parse(v));
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const sameReview=(a,b)=>Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(key=>a[key]===b[key]);
const name=v=>typeof v==='string'&&v.trim()&&v.length<=100;
function url(value,hosts,path){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&hosts.includes(u.hostname)&&path(u);}catch{return false;}}
const nbaUrl=(value,key)=>url(value,['nba.com','www.nba.com'],u=>new RegExp('^/player/'+key+'(?:/|$)').test(u.pathname));
const espnUrl=(value,key)=>url(value,['espn.com','www.espn.com','africa.espn.com'],u=>new RegExp('^/nba/player/(?:[a-z]+/)?_/id/'+key+'(?:/|$)').test(u.pathname)||/^\/nba\/player(?:\/(?:bio|stats|gamelog|news|splits))?\/?$/.test(u.pathname)&&u.searchParams.get('id')===key);
export const statusEvidence=value=>url(value,['nba.com','www.nba.com','espn.com','www.espn.com','africa.espn.com'],u=>u.hostname.endsWith('nba.com')?/^\/(?:news\/|[a-z]+\/news\/|player\/)/.test(u.pathname):/^\/nba\/(?:story\/|player\/)/.test(u.pathname));
export function validateDirectory(value){
 if(value?.version!==1||value.type!=='nba-player-corrections'||!Array.isArray(value.identities)||!Array.isArray(value.statuses)||value.identities.length>5000||value.statuses.length>5000||'records'in value||'teams'in value)throw Error('Se necesita un JSON de correcciones de identidad y estados; no un historial ni una plantilla.');
 const nbas=new Set(),espns=new Set(),keys=new Set();
 for(const p of value.identities){
  if(!id(p.nba)||!id(p.espn)||!name(p.name)||!day(p.birthDate)||!iso(p.checkedAt)||!nbaUrl(p.nbaUrl,p.nba)||!espnUrl(p.espnUrl,p.espn)||nbas.has(p.nba)||espns.has(p.espn))throw Error('Identidad duplicada o sin IDs, fecha de nacimiento y evidencias NBA/ESPN válidas.');
  nbas.add(p.nba);espns.add(p.espn);
 }
 for(const p of value.statuses){
  if(!/^(?:nba|espn):player:[1-9]\d*$/.test(p.key)||!name(p.name)||!['active','retired','unknown'].includes(p.state)||!iso(p.checkedAt)||!statusEvidence(p.evidenceUrl)||keys.has(p.key)||p.note!=null&&(typeof p.note!=='string'||p.note.length>1000))throw Error('Estado duplicado o sin identidad estable, revisión y fuente NBA/ESPN verificable.');
  keys.add(p.key);
 }
 return value;
}
export function effectiveIdentities(rosters,directory=emptyDirectory()){
 const all=new Map();for(const t of rosters?.teams||[])for(const p of t.players)if(p.identity?.status==='reviewed'&&p.ids.espn)all.set(p.ids.nba,{nba:p.ids.nba,espn:p.ids.espn,...p.identity,name:p.name});
 for(const p of directory.identities){const old=all.get(p.nba);if(!old||Date.parse(p.checkedAt)>=Date.parse(old.checkedAt))all.set(p.nba,p);}
 const used=new Set();for(const p of all.values()){if(used.has(p.espn))throw Error('Conflicto: un ID ESPN quedaría asociado a dos identidades NBA. No se han aplicado las correcciones.');used.add(p.espn);}
 return all;
}
export function directoryAliases(rosters,directory){const aliases=new Map();for(const t of rosters?.teams||[])for(const p of t.players)aliases.set('nba:player:'+p.ids.nba,'nba:player:'+p.ids.nba);for(const p of effectiveIdentities(rosters,directory).values()){aliases.set('nba:player:'+p.nba,'nba:player:'+p.nba);aliases.set('espn:player:'+p.espn,'nba:player:'+p.nba);}return aliases;}
export function mergeDirectory(base,incoming,rosters){
 validateDirectory(base);validateDirectory(incoming);const result=emptyDirectory();
 for(const [field,key]of [['identities','nba'],['statuses','key']]){
  const map=new Map(base[field].map(p=>[p[key],p]));
  for(const p of incoming[field]){const old=map.get(p[key]);if(old&&Date.parse(p.checkedAt)===Date.parse(old.checkedAt)&&!sameReview(p,old))throw Error('Dos revisiones distintas tienen la misma fecha. Corrige la revisión antes de combinar.');if(!old||Date.parse(p.checkedAt)>Date.parse(old.checkedAt))map.set(p[key],p);}
  result[field]=[...map.values()];
 }
 validateDirectory(result);effectiveIdentities(rosters,result);statusMap(result,directoryAliases(rosters,result));return result;
}
export function statusMap(directory=emptyDirectory(),aliases=new Map()){
 const map=new Map();for(const p of directory.statuses){const key=aliases.get(p.key)||p.key,old=map.get(key);if(old&&Date.parse(p.checkedAt)===Date.parse(old.checkedAt)&&old.state!==p.state)throw Error('Estados contradictorios para la misma identidad y fecha.');if(!old||Date.parse(p.checkedAt)>Date.parse(old.checkedAt))map.set(key,p);}return map;
}
export function playerState(key,directory,aliases,now=new Date()){
 const p=statusMap(directory,aliases).get(aliases?.get(key)||key);return p&&Date.parse(p.checkedAt)<=Number(now)?p.state:'unknown';
}
export function retiredPlayers(directory,aliases,now=new Date()){return new Set([...statusMap(directory,aliases)].filter(([,p])=>p.state==='retired'&&Date.parse(p.checkedAt)<=Number(now)).map(([key])=>key));}
export function visiblePlayerOptions(records,retired=new Set()){return entityOptions(records,'player').filter(p=>!retired.has(p.id));}
export function identityReport(records,rosters,directory=emptyDirectory()){
 const aliases=directoryAliases(rosters,directory),identities=effectiveIdentities(rosters,directory),counts=new Map();
 for(const r of records)if(r.kind==='player'){const key=aliases.get(entityKey(r))||entityKey(r);counts.set(key,(counts.get(key)||0)+1);}
 const players=(rosters?.teams||[]).flatMap(t=>t.players.map(p=>{const key='nba:player:'+p.ids.nba,hasIdentity=identities.has(p.ids.nba),games=counts.get(key)||0;return {key,name:p.name,team:t.id,games,state:games?'linked-history':hasIdentity?'no-imported-history':'identity-pending'};}));
 return {registered:players.length,linked:players.filter(p=>p.state==='linked-history').length,noHistory:players.filter(p=>p.state==='no-imported-history').length,pending:players.filter(p=>p.state==='identity-pending').length,identityCount:identities.size,players};
}
