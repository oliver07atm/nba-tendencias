import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {validateNbaStatMappings,prepareNbaStatGame,applyNbaStatGame,emptyNbaStatUpdates} from '../src/data/nbastat/updates.js';
import {profileExternalEvidence,referencedCanonicalId} from '../src/data/nbastat/identity-evidence.js';
import {mergeNbaStatMappings} from '../src/data/nbastat/import.js';
import {nbaStatFixture} from './fixtures/nbastat.js';
import {inspectPlayers} from '../scripts/lib/nbastat/player-inspection.mjs';
import {openProbe} from '../scripts/lib/nbastat/sealed-probe.mjs';
import {createNbaStatClient,emptyLedger,HOUR} from '../scripts/lib/nbastat/client.mjs';
const config=JSON.parse(readFileSync(new URL('../nbastat-source.json',import.meta.url))),pass='FICTITIOUS_PASSPHRASE_32_CHARACTERS_OR_MORE';
// Fictional API field names/IDs. Do NOT assert these fields exist in the real endpoint.
function packet(){return {purpose:'NBA Stat private player inspection; NOT approved for publication',request:{endpoint:'/api/v1/players/990001',playerId:'990001'},raw:{fictional:{internal:990001,external:990101,name:'FICTICIO'}}};}
function evidence(){return profileExternalEvidence(packet(),{sourceId:'990001',canonicalKey:'nba:player:990101',sourceIdPath:'/fictional/internal',externalIdPath:'/fictional/external'});}
test('Legacy DOB mappings remain compatible; missing source DOB stays invalid without genuine alternative evidence',()=>{
 const f=nbaStatFixture();assert.equal(validateNbaStatMappings(f.mapping),f.mapping);delete f.mapping.players[0].sourceBirthDate;assert.throws(()=>validateNbaStatMappings(f.mapping),/evidencias/);f.mapping.players[0].sourceBirthDate='2000-02-02';assert.throws(()=>validateNbaStatMappings(f.mapping),/nacimiento/);
});
test('Private profile explicit ID evidence needs observed paths and exact internal/external IDs, not name',()=>{
 const e=evidence(),f=nbaStatFixture(),p=f.mapping.players[0];p.sourceBirthDate=null;p.identityEvidence=e;validateNbaStatMappings(f.mapping);assert.equal(p.sourceBirthDate,null);
 for(const change of [{sourceIdPath:'/fictional/name'},{externalIdPath:'/fictional/name'},{canonicalKey:'nba:player:990102'},{sourceIdPath:'/fictional/not_observed'}])assert.throws(()=>profileExternalEvidence(packet(),{sourceId:'990001',canonicalKey:'nba:player:990101',sourceIdPath:'/fictional/internal',externalIdPath:'/fictional/external',...change}));
 const wrong=packet();wrong.request.playerId='990002';assert.throws(()=>profileExternalEvidence(wrong,{sourceId:'990001',canonicalKey:'nba:player:990101',sourceIdPath:'/fictional/internal',externalIdPath:'/fictional/external'}));
 const realBirthNotInvented=nbaStatFixture();realBirthNotInvented.mapping.players[0].identityEvidence=e;assert.throws(()=>validateNbaStatMappings(realBirthNotInvented.mapping),/evidencias/);
});
test('Official profile URLs can reference stable IDs; arbitrary domains, names and DOBs cannot',()=>{
 assert.equal(referencedCanonicalId('https://www.nba.com/player/990101/fictional','nba'),'990101');assert.equal(referencedCanonicalId('https://www.espn.com/nba/player/_/id/990201','espn'),'990201');
 for(const value of ['FICTICIO','2000-01-01','https://evil.test/player/990101','https://www.nba.com/player/990101?secret=x'])assert.equal(referencedCanonicalId(value,'nba'),null);
 const q=packet();q.raw.fictional.external='https://www.nba.com/player/990101/fictional';assert.equal(profileExternalEvidence(q,{sourceId:'990001',canonicalKey:'nba:player:990101',sourceIdPath:'/fictional/internal',externalIdPath:'/fictional/external'}).value,q.raw.fictional.external);
});
test('Provider crosswalk requires both stable IDs, genuine issuer declaration and private reference; no source DOB claim',()=>{
 const f=nbaStatFixture(),p=f.mapping.players[0];p.sourceBirthDate=null;p.identityEvidence={method:'provider-crosswalk',sourceId:p.sourceId,canonicalKey:p.key,issuer:'NBA Stat',privateReference:'private-email:2031-01-03:FICTITIOUS_REFERENCE'};validateNbaStatMappings(f.mapping);
 for(const change of [{issuer:'Someone'},{canonicalKey:'nba:player:990999'},{sourceId:'990999'},{privateReference:''},{method:'similar-name'}]){const q=structuredClone(f.mapping);Object.assign(q.players[0].identityEvidence,change);assert.throws(()=>validateNbaStatMappings(q),/evidencias/);}
});
test('Alternative mappings still reject canonical DOB conflicts/duplicate identities and preserve records through normal upsert',()=>{
 const f=nbaStatFixture(),p=f.mapping.players[0];p.sourceBirthDate=null;p.identityEvidence=evidence();assert.throws(()=>mergeNbaStatMappings({version:1,players:[],teams:[]},f.mapping,{birthDates:new Map([[p.key,'2000-02-02']])}),/nacimiento/);
 const before=JSON.stringify(f.contract),batch=prepareNbaStatGame(f.contract,f.mapping);assert.equal(batch.records.length,4);const state=applyNbaStatGame(emptyNbaStatUpdates(),batch).state;assert.equal(applyNbaStatGame(state,batch).reason,'DUPLICATE');assert.equal(JSON.stringify(f.contract),before);
});
test('Encrypted profile/list inspection does one request, no assumptions about fields and shared durable 10/60 quota',async()=>{
 let state=emptyLedger(),calls=0;const urls=[],now=Date.parse('2031-01-03T00:00:00Z'),store={readLedger:async()=>state,writeLedger:async next=>{state=next;},withLock:f=>f()},fetchImpl=async url=>{calls++;urls.push(String(url));assert.equal(state.attempts.length,calls);return new Response(JSON.stringify(packet().raw));},options={config,token:'FICTITIOUS_API_TOKEN',passphrase:pass,confirmation:'INSPECT_PLAYERS',store,fetchImpl,clock:()=>now,playerId:'990001'};
 const result=await inspectPlayers(options);assert.equal(calls,1);const p=openProbe(result.sealed,pass);assert.deepEqual(p.raw,packet().raw);assert.equal(p.identityVerified,false);assert.ok(!JSON.stringify(result).includes('FICTICIO'));assert.ok(!JSON.stringify(p).includes(options.token));assert.equal(p.request.playerId,'990001');
 await inspectPlayers({...options,mode:'players-list',teamId:'99001',page:2});assert.equal(calls,2);assert.ok(urls[1].includes('per_page=100'));assert.ok(urls[1].includes('page=2'));assert.ok(urls[1].includes('team_id=99001'));
 const client=createNbaStatClient({...options,...store,config:{...config,enabled:true},purpose:'private-inspection'});for(let i=2;i<10;i++)await client.boxScore('990000001');assert.equal(calls,10);assert.equal((await inspectPlayers(options)).status,'deferred');assert.equal(calls,10);
 state=emptyLedger();await assert.rejects(inspectPlayers({...options,confirmation:''}));await assert.rejects(inspectPlayers({...options,passphrase:'short'}));await assert.rejects(inspectPlayers({...options,playerId:'x'}));assert.equal(state.attempts.length,0);
 await assert.rejects(inspectPlayers({...options,fetchImpl:async()=>new Response('NEVER_PRINT',{status:429,headers:{'Retry-After':'7200'}})}),/HTTP_429/);assert.equal(state.blockedUntil,now+2*HOUR);assert.equal((await inspectPlayers(options)).status,'deferred');
});
test('Identity inspection workflow is manual-only, same concurrency/secrets/quota, encrypted artifact only',()=>{
 const s=readFileSync(new URL('../.github/workflows/nbastat-player-inspection.yml',import.meta.url),'utf8');assert.ok(s.includes('workflow_dispatch:'));assert.ok(!/schedule:|pull_request:|^  push:/m.test(s));assert.ok(s.includes('group: nbastat-account-quota'));assert.ok(s.includes('cancel-in-progress: false'));assert.ok(s.includes('secrets.NBASTAT_API_TOKEN'));assert.ok(s.includes('secrets.NBASTAT_PROBE_PASSPHRASE'));assert.ok(s.includes('default: \'1548\''));assert.ok(!s.includes('60 minutos sin'));assert.ok(s.includes('path: work/nbastat-player-sealed/review.sealed.json'));
});

test('One reviewed list page prepares a private bulk crosswalk by explicit IDs and known canonical DOBs only',async()=>{
 const {bulkProfileMappings}=await import('../src/data/nbastat/identity-evidence.js');
 const list={purpose:'NBA Stat private player inspection; NOT approved for publication',request:{endpoint:'/api/v1/players',page:1},raw:{fictional_rows:[{local:990001,foreign:990101,name:'FICTICIO'},{local:990002,foreign:990102,name:'FICTICIO'},{local:990003,name:'FICTICIO sin ID externo'},{local:990004,foreign:990104,name:'FICTICIO sin DOB canónico'}]}};
 const options={rowsPath:'/fictional_rows',sourceIdPath:'/local',externalIdPath:'/foreign',namespace:'nba',knownKeys:new Set(['nba:player:990101','nba:player:990102','nba:player:990104']),birthDates:new Map([['nba:player:990101','2000-01-01'],['nba:player:990102','2000-01-01']]),checkedAt:'2031-01-03T00:00:00Z'};
 const result=bulkProfileMappings(list,options);assert.equal(result.mappings.players.length,2);assert.equal(result.pending.length,2);assert.ok(result.mappings.players.every(p=>p.sourceBirthDate===null));validateNbaStatMappings(result.mappings);
 assert.equal(result.pending[0].reason,'EXTERNAL_ID_UNKNOWN');assert.equal(result.pending[1].reason,'CANONICAL_BIRTH_DATE_UNVERIFIED');assert.equal(bulkProfileMappings(list,{...options,sourceIds:new Set(['990001'])}).mappings.players.length,1);
 const duplicate=structuredClone(list);duplicate.raw.fictional_rows[1].local=990001;assert.throws(()=>bulkProfileMappings(duplicate,options),/duplicados/);
 const fieldMissing={...options,externalIdPath:'/fieldNotObserved'};assert.equal(bulkProfileMappings(list,fieldMissing).mappings.players.length,0);
});
