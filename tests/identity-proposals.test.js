import test from 'node:test';import assert from 'node:assert/strict';
import {observationsFromProfiles,buildCanonicalCatalog,proposeIdentities,approveIdentityBatch} from '../src/data/nbastat/identity-proposals.js';
import {validateNbaStatMappings,prepareNbaStatGame} from '../src/data/nbastat/updates.js';
import {nbaStatFixture} from './fixtures/nbastat.js';
// ALL names, dates and IDs in this suite are FICTITIOUS. DOB fields are not claims about NBA Stat.
export function identityScenario(){
 const packet={purpose:'NBA Stat private player inspection; NOT approved for publication',synthetic:true,request:{endpoint:'/api/v1/players'},raw:{fictitious:[{local:990001,label:'Álfa Prueba',dob:'2000-01-01',team:99001},{local:990002,label:'Beta Prueba',dob:'2001-02-03',team:99002}]}},schema={rowsPath:'/fictitious',idPath:'/local',namePath:'/label',birthPath:'/dob',teamPath:'/team',teams:[{sourceId:'99001',team:'BOS'},{sourceId:'99002',team:'DET'}]},catalog=[['990101','Alfa Prueba','2000-01-01','BOS'],['990102','Beta Prueba','2001-02-03','DET']].map(([n,name,birthDate,team])=>({key:'nba:player:'+n,names:[name],birthDate,teams:[team],canonicalUrl:'https://www.nba.com/player/'+n})),existing={version:1,players:[],teams:[]};return {packet,schema,catalog,existing};
}
test('Observed future birth fields permit explicit unique batch approval and indefinite stable-ID reuse',async()=>{
 const f=identityScenario(),before=JSON.stringify(f);const observations=await observationsFromProfiles(f.packet,f.schema,{confirmed:true}),report=proposeIdentities(observations,f.catalog,f.existing);assert.equal(report.counts.eligible,2);
 assert.throws(()=>approveIdentityBatch({...f,observations,sourceIds:['990001']}));const mappings=approveIdentityBatch({...f,observations,sourceIds:['990001','990002'],confirmed:true,checkedAt:'2031-01-03T00:00:00Z'});validateNbaStatMappings(mappings);assert.equal(mappings.players.length,2);const realGate=nbaStatFixture().contract;realGate.synthetic=false;assert.throws(()=>prepareNbaStatGame(realGate,mappings),/ficticias/);assert.equal(proposeIdentities(observations.map(o=>({...o,name:'Nombre cambiado',birthDate:null,team:null})),f.catalog,mappings).counts.linked,2);assert.equal(JSON.stringify(f),before);
});
test('Names/teams alone, unrevised fields, DOB conflict, duplicate people and IDs cannot be batch-approved',async()=>{
 const f=identityScenario(),obs=await observationsFromProfiles(f.packet,f.schema,{confirmed:true});
 for(const observations of [obs.map(o=>({...o,birthDate:null,birthPointer:null})),obs.map(o=>({...o,fieldsReviewed:false})),obs.map(o=>({...o,birthDate:'1990-01-01'}))]){assert.equal(proposeIdentities(observations,f.catalog,f.existing).counts.eligible,0);assert.throws(()=>approveIdentityBatch({...f,observations,sourceIds:['990001'],confirmed:true}));}
 const catalog=[...f.catalog,{...f.catalog[0],key:'nba:player:990999',canonicalUrl:'https://www.nba.com/player/990999'}];assert.equal(proposeIdentities(obs,catalog,f.existing).rows[0].status,'ambiguous');
 assert.equal(proposeIdentities(obs,f.catalog.map(c=>({...c,birthDate:null})),f.existing).rows[0].reasons[0],'CANONICAL_BIRTH_DATE_UNAVAILABLE');
 const duplicate=[obs[0],{...obs[0],sourceId:'990003'}];assert.equal(proposeIdentities(duplicate,f.catalog,f.existing).counts.eligible,0);assert.throws(()=>proposeIdentities([obs[0],obs[0]],f.catalog));
});
test('Missing DOB has no guessed field; ambiguous dates, wrong paths and mismatched source IDs rejected',async()=>{
 const f=identityScenario();const noBirth=await observationsFromProfiles(f.packet,{...f.schema,birthPath:''},{confirmed:true});assert.equal(noBirth[0].birthDate,null);assert.equal(proposeIdentities(noBirth,f.catalog).counts.eligible,0);
 f.packet.raw.fictitious[0].dob='01/02/2000';await assert.rejects(observationsFromProfiles(f.packet,f.schema));await assert.rejects(observationsFromProfiles(f.packet,{...f.schema,idPath:'/not_observed'}));
});
test('Canonical ESPN aliases collapse before matching without touching historical records',()=>{const records=[{kind:'player',entityId:'espn:player:990201',entity:'Alfa Prueba',team:'BOS',points:20}],before=JSON.stringify(records);const catalog=buildCanonicalCatalog({targets:[{id:'nba:player:990101',label:'Alfa Prueba'},{id:'espn:player:990201',label:'Álfa Prueba'}],aliases:new Map([['espn:player:990201','nba:player:990101']]),birthDates:new Map([['nba:player:990101','2000-01-01']]),records});assert.equal(catalog.length,1);assert.equal(catalog[0].names.length,2);assert.equal(JSON.stringify(records),before);});
