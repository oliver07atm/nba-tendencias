// Offline proposal/review engine. No HTTP, no guessed provider DOB fields, no season expiry.
import {readPrivateReview,rejectCredentials,mergeNbaStatMappings} from './import.js';
import {observedProfileField,normalizeIdentityName} from './identity-evidence.js';
const id=v=>typeof v==='string'&&/^[1-9]\d*$/.test(v);
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const asId=v=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0?String(v):id(v)?v:null;
const sha=async value=>'private-sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(b=>b.toString(16).padStart(2,'0')).join('');
export function buildCanonicalCatalog({targets,aliases=new Map(),birthDates=new Map(),records=[]}){
 const map=new Map();
 for(const t of targets){const key=aliases.get(t.id)||t.id;if(!/^(nba|espn):player:[1-9]\d*$/.test(key))continue;let p=map.get(key);if(!p){p={key,names:[],birthDate:birthDates.get(key)||null,teams:[],canonicalUrl:key.startsWith('nba:')?'https://www.nba.com/player/'+key.split(':').at(-1):'https://www.espn.com/nba/player/_/id/'+key.split(':').at(-1)};map.set(key,p);}if(t.label&&!p.names.includes(t.label))p.names.push(t.label);}
 for(const r of records){if(r.kind!=='player')continue;const p=map.get(aliases.get(r.entityId)||r.entityId);if(p){if(r.entity&&!p.names.includes(r.entity))p.names.push(r.entity);if(r.team&&!p.teams.includes(r.team))p.teams.push(r.team);}}
 return [...map.values()]; // Team history is only supporting context, never proof of current membership.
}
export async function observationsFromBoxscore(file,{teams=[]}={}){
 const {parsed}=readPrivateReview(file),reference=await sha(file.raw);
 return parsed.players.map((p,i)=>({sourceId:p.sourceId,name:p.name,birthDate:null,team:teams.find(t=>t.sourceId===p.teamId)?.team||null,teamId:p.teamId,reference,namePointer:'/data/players/'+i+'/player_name',idPointer:'/data/players/'+i+'/player_id',birthPointer:null,fieldsReviewed:false,synthetic:file.synthetic===true}));
}
// Schema paths must be entered after observing a private response; no default DOB field name.
export async function observationsFromProfiles(packet,schema,{confirmed=false}={}){
 rejectCredentials(packet);rejectCredentials(schema);
 if(packet?.purpose!=='NBA Stat private player inspection; NOT approved for publication'||!/^\/api\/v1\/players(?:\/[1-9]\d*)?$/.test(packet.request?.endpoint||''))throw Error('Selecciona una inspección privada de perfiles.');
 const rows=schema.rowsPath?observedProfileField(packet.raw,schema.rowsPath):[packet.raw];
 if(!Array.isArray(rows)||rows.length>1000)throw Error('Se necesita un array observado de hasta 1000 perfiles.');
 const reference=await sha(packet.raw),seen=new Set();
 return rows.map((r,i)=>{const sourceId=asId(observedProfileField(r,schema.idPath)),name=observedProfileField(r,schema.namePath);if(!sourceId||seen.has(sourceId)||typeof name!=='string'||!name.trim())throw Error('ID interno duplicado/ausente o nombre inválido.');seen.add(sourceId);
 if(packet.request.endpoint!=='/api/v1/players'&&(packet.request.endpoint!=='/api/v1/players/'+sourceId||String(packet.request.playerId)!==sourceId))throw Error('El ID observado no coincide con el perfil solicitado.');
 let birthDate=null;if(schema.birthPath){let v=null;try{v=observedProfileField(r,schema.birthPath);}catch{}if(v!==null&&v!==''){if(!day(v))throw Error('Nacimiento sin formato ISO de fecha revisado: no se adivina ni convierte.');birthDate=v;}}
 let team=null;if(schema.teamPath){const v=asId(observedProfileField(r,schema.teamPath));team=(schema.teams||[]).find(t=>t.sourceId===v)?.team||null;}
 const prefix=schema.rowsPath?schema.rowsPath+'/'+i:'';
 return {sourceId,name,birthDate,team,reference,idPointer:prefix+schema.idPath,namePointer:prefix+schema.namePath,birthPointer:schema.birthPath?prefix+schema.birthPath:null,fieldsReviewed:confirmed===true,synthetic:packet.synthetic===true};});
}
function similarity(a,b){if(a===b)return 1;const x=new Set(a.split(' ')),y=new Set(b.split(' '));return [...x].filter(t=>y.has(t)).length/Math.max(x.size,y.size);}
export function proposeIdentities(observations,catalog,existing={version:1,players:[],teams:[]}){
 rejectCredentials(observations);rejectCredentials(catalog);
 const sourceIds=new Set(),canonicalIds=new Set();for(const c of catalog){if(canonicalIds.has(c.key))throw Error('Catálogo canónico duplicado: normaliza NBA/ESPN primero.');canonicalIds.add(c.key);}
 const rows=observations.map(o=>{if(!id(o.sourceId)||sourceIds.has(o.sourceId)||typeof o.name!=='string'||!normalizeIdentityName(o.name))throw Error('Observaciones de identidad inválidas o duplicadas.');sourceIds.add(o.sourceId);
 const old=existing.players.find(p=>p.sourceId===o.sourceId),norm=normalizeIdentityName(o.name);
 const candidates=catalog.map(c=>{const names=c.names.map(normalizeIdentityName),n=Math.max(0,...names.map(x=>similarity(x,norm))),birthMatch=!!o.birthDate&&o.birthDate===c.birthDate,birthConflict=!!o.birthDate&&!!c.birthDate&&o.birthDate!==c.birthDate,teamMatch=!!o.team&&c.teams.includes(o.team);return {key:c.key,name:c.names[0],score:Math.round(n*100)+(birthMatch?80:0)+(teamMatch?10:0),nameMatch:n===1,birthMatch,birthConflict,teamMatch,canonicalBirthAvailable:!!c.birthDate};}).filter(c=>c.score>=40).sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key));
 const strong=candidates.filter(c=>c.nameMatch&&c.birthMatch&&!c.birthConflict),reasons=[];let status='pending',key=null;
 if(old){key=old.key;const c=catalog.find(c=>c.key===old.key);if(o.birthDate&&o.birthDate!==old.birthDate||c?.birthDate&&c.birthDate!==old.birthDate){status='conflict';reasons.push('EXISTING_LINK_BIRTH_CONFLICT');}else{status='linked';reasons.push('STABLE_ID_REUSED');}}
 else if(strong.length>1){status='ambiguous';reasons.push('MULTIPLE_NAME_AND_BIRTH_MATCHES');}
 else if(strong.length===1){key=strong[0].key;if(o.fieldsReviewed&&/^private-sha256:[a-f0-9]{64}$/.test(o.reference||'')&&o.birthPointer&&o.namePointer&&o.idPointer){status='eligible';}else reasons.push('SOURCE_FIELDS_NOT_REVIEWED');}
 else{if(!o.birthDate)reasons.push('SOURCE_BIRTH_DATE_UNAVAILABLE');else if(candidates.some(c=>c.nameMatch&&c.birthConflict))reasons.push('BIRTH_DATE_CONFLICT');else if(candidates.some(c=>c.nameMatch&&!c.canonicalBirthAvailable))reasons.push('CANONICAL_BIRTH_DATE_UNAVAILABLE');else reasons.push('NO_UNIQUE_STRONG_MATCH');}
 return {sourceId:o.sourceId,name:o.name,status,key,reasons,candidates};});
 for(const r of rows)if(r.status==='eligible'&&(rows.some(x=>x.sourceId!==r.sourceId&&x.key===r.key)||existing.players.some(p=>p.key===r.key&&p.sourceId!==r.sourceId))){r.status='ambiguous';r.reasons.push('CANONICAL_ID_ALREADY_CLAIMED');}
 const eligible=rows.filter(r=>r.status==='eligible').length,linked=rows.filter(r=>r.status==='linked').length;
 return {rows,measured:{denominator:rows.length,reusedPercent:rows.length?100*linked/rows.length:0,eligiblePercent:rows.length?100*eligible/rows.length:0},counts:Object.fromEntries(['linked','eligible','pending','conflict','ambiguous'].map(s=>[s,rows.filter(r=>r.status===s).length])),total:rows.length};
}
export function approveIdentityBatch({observations,catalog,existing,sourceIds,confirmed=false,checkedAt=new Date().toISOString(),mappingContext={}}){
 if(!confirmed||!Array.isArray(sourceIds)||!sourceIds.length||new Set(sourceIds).size!==sourceIds.length)throw Error('Selecciona propuestas únicas y confirma las evidencias del lote.');
 const report=proposeIdentities(observations,catalog,existing),players=[];
 for(const sourceId of sourceIds){const r=report.rows.find(r=>r.sourceId===sourceId);if(r?.status!=='eligible')throw Error('El lote contiene identidades pendientes, ambiguas o ya vinculadas.');const o=observations.find(o=>o.sourceId===sourceId),c=catalog.find(c=>c.key===r.key),canonicalName=c.names.find(n=>normalizeIdentityName(n)===normalizeIdentityName(o.name));
 players.push({sourceId,key:c.key,status:'reviewed',birthDate:c.birthDate,sourceBirthDate:o.birthDate,canonicalBirthDate:c.birthDate,checkedAt,sourceUrl:'https://nbastat.io/api/v1/players/'+sourceId,canonicalUrl:c.canonicalUrl,identityEvidence:{method:'profile-attributes',sourceId,canonicalKey:c.key,sourceName:o.name,canonicalName,birthDate:o.birthDate,sourceReference:o.reference,idPointer:o.idPointer,namePointer:o.namePointer,birthPointer:o.birthPointer,canonicalReference:c.canonicalUrl,fieldsReviewed:true,...(o.synthetic?{synthetic:true}:{})}});
 }
 return mergeNbaStatMappings(existing,{version:1,players,teams:[]},mappingContext);
}
