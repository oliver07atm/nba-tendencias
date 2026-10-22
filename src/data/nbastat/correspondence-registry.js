// Private evidence registry. No original historical rows or public delivery payloads here.
import {validateNbaStatMappings} from './updates.js';
import {mergeNbaStatMappings,rejectCredentials} from './import.js';
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export const emptyCorrespondenceRegistry=()=>({version:1,scope:'private-only',catalog:[],mappings:{version:1,players:[],teams:[]},gameLinks:[],blockedPlayers:[]});
export function validateCorrespondenceRegistry(r){
 rejectCredentials(r);
 if(r?.version!==1||r.scope!=='private-only'||Object.keys(r).some(k=>!['version','scope','catalog','mappings','gameLinks','blockedPlayers'].includes(k))||!Array.isArray(r.catalog)||!Array.isArray(r.gameLinks)||r.catalog.length>10000||r.gameLinks.length>10000)throw Error('Registro privado de correspondencias inválido.');
 validateNbaStatMappings(r.mappings);if(r.blockedPlayers!==undefined&&(!Array.isArray(r.blockedPlayers)||new Set(r.blockedPlayers).size!==r.blockedPlayers.length||r.blockedPlayers.some(id=>!r.mappings.players.some(p=>p.sourceId===id))))throw Error('Bloqueos de identidad inválidos.');const keys=new Set();
 for(const c of r.catalog){if(!/^(nba|espn):player:[1-9]\d*$/.test(c.key)||keys.has(c.key)||!Array.isArray(c.names)||!c.names.length||c.names.some(n=>typeof n!=='string'||!n.trim()||n.length>200)||!Array.isArray(c.teams)||c.teams.some(t=>typeof t!=='string'||! /^[A-Z]{3}$/.test(t))||c.birthDate!==null&&!date(c.birthDate)||Object.keys(c).some(k=>!['key','names','birthDate','teams','canonicalUrl'].includes(k)))throw Error('Catálogo canónico privado inválido.');
 const expected=c.key.startsWith('nba:')?'https://www.nba.com/player/'+c.key.split(':').at(-1):'https://www.espn.com/nba/player/_/id/'+c.key.split(':').at(-1);if(c.canonicalUrl!==expected)throw Error('Referencia canónica no corresponde al ID.');keys.add(c.key);}
 const a=new Set(),b=new Set();for(const l of r.gameLinks){if(l?.version!==1||l.status!=='locally-reviewed'||!/^bdl:game:[1-9]\d*$/.test(l.calendar?.id||'')||!/^[1-9]\d*$/.test(l.sourceId||'')||a.has(l.calendar.id)||b.has(l.sourceId))throw Error('Enlaces de partidos duplicados o pendientes.');a.add(l.calendar.id);b.add(l.sourceId);}
 return r;
}
export function mergeCorrespondenceRegistry(base,incoming){
 validateCorrespondenceRegistry(base);validateCorrespondenceRegistry(incoming);
 const catalog=new Map(base.catalog.map(c=>[c.key,structuredClone(c)]));
 for(const c of incoming.catalog){const old=catalog.get(c.key);if(old?.birthDate&&c.birthDate&&old.birthDate!==c.birthDate)throw Error('Nacimiento canónico contradictorio: requiere revisión independiente.');catalog.set(c.key,old?{...c,birthDate:c.birthDate||old.birthDate,names:[...new Set([...old.names,...c.names])],teams:[...new Set([...old.teams,...c.teams])]}:structuredClone(c));}
 for(const p of incoming.mappings.players){const old=base.mappings.players.find(o=>o.sourceId===p.sourceId);if(old&&old.key!==p.key)throw Error('Un ID estable ya verificado no se reasigna automáticamente.');}
 const context={knownKeys:new Set(catalog.keys()),birthDates:new Map([...catalog.values()].filter(c=>c.birthDate).map(c=>[c.key,c.birthDate]))};
 const mappings=mergeNbaStatMappings(base.mappings,incoming.mappings,context),links=structuredClone(base.gameLinks);
 for(const l of incoming.gameLinks){if(links.some(o=>(o.sourceId===l.sourceId)!==(o.calendar.id===l.calendar.id)))throw Error('Correspondencia de partido contradictoria.');const i=links.findIndex(o=>o.sourceId===l.sourceId);if(i>=0){if(Date.parse(l.checkedAt)<Date.parse(links[i].checkedAt))throw Error('Enlace de partido antiguo.');links[i]=structuredClone(l);}else links.push(structuredClone(l));}
 return validateCorrespondenceRegistry({version:1,scope:'private-only',catalog:[...catalog.values()],mappings,gameLinks:links,blockedPlayers:[...new Set([...(base.blockedPlayers||[]),...(incoming.blockedPlayers||[])])]});
}

// Only an explicitly reviewed corrected observation can release a hold. No silent remapping.
export function resolveIdentityBlocks(registry,{observations=[],confirmed=false}={}){
 validateCorrespondenceRegistry(registry);if(!confirmed)return registry;
 const resolved=new Set(observations.filter(o=>o.fieldsReviewed===true&&/^private-sha256:[a-f0-9]{64}$/.test(o.reference||'')&&registry.mappings.players.some(p=>p.sourceId===o.sourceId&&p.birthDate===o.birthDate)).map(o=>o.sourceId));
 return {...registry,blockedPlayers:(registry.blockedPlayers||[]).filter(id=>!resolved.has(id))};
}
