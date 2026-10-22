// Evidence is locally reviewed, never authenticated by this offline validator.
// Alternative methods do NOT assert a birth date observed in NBA Stat.
const id=v=>typeof v==='string'&&/^[1-9]\d*$/.test(v);
const pointer=v=>typeof v==='string'&&/^\/(?:[A-Za-z_0-9~-]+\/)*[A-Za-z_0-9~-]+$/.test(v)&&v.length<300;
function reference(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='nbastat.io'&&!u.username&&!u.password&&!u.search&&!u.hash&&/^\/api\/v1\/players(?:\/[1-9]\d*)?$/.test(u.pathname);}catch{return false;}}
export function referencedCanonicalId(value,namespace){
 if(id(value))return value;
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash)return null;
  const hosts=namespace==='nba'?['nba.com','www.nba.com']:namespace==='espn'?['espn.com','www.espn.com']:[];
  if(!hosts.includes(u.hostname))return null;
  return (namespace==='nba'?/^\/player\/([1-9]\d*)(?:\/|$)/:/^\/nba\/player\/(?:[a-z]+\/)?_\/id\/([1-9]\d*)(?:\/|$)/).exec(u.pathname)?.[1]||null;
 }catch{return null;}
}
export const normalizeIdentityName=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
export function validNbaStatIdentityEvidence(p){
 const e=p.identityEvidence;
 if(e?.method==='profile-attributes')return Object.keys(e).every(k=>['method','sourceId','canonicalKey','sourceName','canonicalName','birthDate','sourceReference','idPointer','namePointer','birthPointer','canonicalReference','fieldsReviewed','synthetic'].includes(k))&&e.sourceId===p.sourceId&&e.canonicalKey===p.key&&e.birthDate===p.birthDate&&p.sourceBirthDate===p.birthDate&&e.fieldsReviewed===true&&!!normalizeIdentityName(e.sourceName)&&normalizeIdentityName(e.sourceName)===normalizeIdentityName(e.canonicalName)&&/^private-sha256:[a-f0-9]{64}$/.test(e.sourceReference||'')&&[e.idPointer,e.namePointer,e.birthPointer].every(pointer)&&new Set([e.idPointer,e.namePointer,e.birthPointer]).size===3&&e.canonicalReference===p.canonicalUrl;
 if(!e)return p.sourceBirthDate===p.birthDate; // Existing reviewed mappings remain compatible.
 if(p.sourceBirthDate!=null||e.sourceId!==p.sourceId||e.canonicalKey!==p.key)return false;
 if(e.method==='explicit-external-id')return Object.keys(e).every(k=>['method','sourceId','canonicalKey','fieldPath','value','namespace','referenceUrl'].includes(k))&&pointer(e.fieldPath)&&referencedCanonicalId(e.value,e.namespace)===p.key.split(':').at(-1)&&e.namespace===p.key.split(':')[0]&&reference(e.referenceUrl)&&['/api/v1/players','/api/v1/players/'+p.sourceId].includes(new URL(e.referenceUrl).pathname);
 if(e.method==='provider-crosswalk')return Object.keys(e).every(k=>['method','sourceId','canonicalKey','issuer','privateReference'].includes(k))&&e.issuer==='NBA Stat'&&typeof e.privateReference==='string'&&/^private-(?:email|document):\S.{5,290}$/.test(e.privateReference);
 return false;
}
// JSON Pointer, no eval and no assumed API field names. For a *reviewed* profile field only.
export function observedProfileField(document,path){
 if(!pointer(path))throw Error('Introduce una ruta JSON Pointer observada, sin adivinar nombres de campos.');
 let value=document;for(const part of path.slice(1).split('/').map(s=>s.replace(/~1/g,'/').replace(/~0/g,'~'))){if(!value||typeof value!=='object'||!Object.hasOwn(value,part))throw Error('La ruta no existe en la respuesta privada.');value=value[part];}return value;
}
export function profileExternalEvidence(packet,{sourceId,canonicalKey,sourceIdPath,externalIdPath}){
 if(packet?.purpose!=='NBA Stat private player inspection; NOT approved for publication'||packet.request?.endpoint!=='/api/v1/players/'+sourceId||packet.request.playerId!==sourceId||!/^(?:nba|espn):player:[1-9]\d*$/.test(canonicalKey))throw Error('La muestra de perfil no corresponde al ID NBA Stat seleccionado.');
 const source=observedProfileField(packet.raw,sourceIdPath),external=observedProfileField(packet.raw,externalIdPath);
 const asId=v=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0?String(v):id(v)?v:null;
 if(asId(source)!==sourceId||referencedCanonicalId(typeof external==='number'?(Number.isSafeInteger(external)&&external>0?String(external):null):external,canonicalKey.split(':')[0])!==canonicalKey.split(':').at(-1)||sourceIdPath===externalIdPath)throw Error('El ID interno o el ID externo observado no coincide; no se enlaza.');
 return {method:'explicit-external-id',sourceId,canonicalKey,fieldPath:externalIdPath,value:typeof external==='number'?(Number.isSafeInteger(external)&&external>0?String(external):null):external,namespace:canonicalKey.split(':')[0],referenceUrl:'https://nbastat.io/api/v1/players/'+sourceId};
}

// Reviewed explicit cross-ID schema can be reused for a page; no name matching or guessed DOB.
export function bulkProfileMappings(packet,{rowsPath,sourceIdPath,externalIdPath,namespace,knownKeys,birthDates,aliases=new Map(),sourceIds=null,checkedAt=new Date().toISOString()}){
 if(packet?.purpose!=='NBA Stat private player inspection; NOT approved for publication'||packet.request?.endpoint!=='/api/v1/players'||!['nba','espn'].includes(namespace)||!(knownKeys instanceof Set)||!(birthDates instanceof Map))throw Error('Se necesita una lista privada y un esquema de IDs explícitos revisado.');
 const rows=observedProfileField(packet.raw,rowsPath);if(!Array.isArray(rows)||rows.length>100)throw Error('La ruta no contiene una página de hasta 100 jugadores.');
 const mappings={version:1,players:[],teams:[]},pending=[],used=new Set();
 for(const [index,row]of rows.entries()){
  const internal=observedProfileField(row,sourceIdPath);let value=null;try{value=observedProfileField(row,externalIdPath);}catch{}const sourceId=typeof internal==='number'&&Number.isSafeInteger(internal)&&internal>0?String(internal):id(internal)?internal:null;
  if(!sourceId||used.has(sourceId))throw Error('IDs internos ausentes o duplicados en la lista.');used.add(sourceId);if(sourceIds&&!sourceIds.has(sourceId))continue;
  const text=typeof value==='number'&&Number.isSafeInteger(value)?String(value):value,external=referencedCanonicalId(text,namespace),key=external?namespace+':player:'+external:null,canonical=aliases.get(key)||key,birth= birthDates.get(canonical);
  if(!key||!knownKeys.has(canonical)||!birth){pending.push({sourceId,reason:!key?'EXTERNAL_ID_UNKNOWN':!knownKeys.has(canonical)?'CANONICAL_ID_UNKNOWN':'CANONICAL_BIRTH_DATE_UNVERIFIED'});continue;}
  mappings.players.push({sourceId,key,status:'reviewed',birthDate:birth,sourceBirthDate:null,canonicalBirthDate:birth,checkedAt,sourceUrl:'https://nbastat.io/api/v1/players/'+sourceId,canonicalUrl:namespace==='nba'?'https://www.nba.com/player/'+external:'https://www.espn.com/nba/player/_/id/'+external,identityEvidence:{method:'explicit-external-id',sourceId,canonicalKey:key,fieldPath:rowsPath+'/'+index+externalIdPath,value:text,namespace,referenceUrl:'https://nbastat.io/api/v1/players'}});
 }
 return {mappings,pending};
}
