import test from'node:test';import assert from'node:assert/strict';
import{nbaStatWireFixture}from'./fixtures/nbastat-wire.js';import{syntheticDeliveryHistory}from'./fixtures/synthetic-delivery-history.js';import{decodeNbaStatResponse}from'../src/data/nbastat/decoder.js';import{prepareNbaStatGame,emptyNbaStatUpdates,applyNbaStatGame,composeNbaStatView}from'../src/data/nbastat/updates.js';import{makeSyntheticDelivery,acceptSyntheticDelivery}from'../src/data/nbastat/synthetic-delivery.js';import{filterRows,summarize}from'../src/engine.js';
function packet(){const f=nbaStatWireFixture(),decoded=decodeNbaStatResponse(f.wire,{review:f.review,receivedAt:f.receivedAt,synthetic:true});const batch=prepareNbaStatGame({...decoded.contract,receivedAt:f.receivedAt,synthetic:true},f.mapping);return makeSyntheticDelivery(applyNbaStatGame(emptyNbaStatUpdates(),batch).state);}
test('Fictitious delivery updates graph values, chronology and denominators without mutating original team history',()=>{
 const data=packet(),base=syntheticDeliveryHistory(data),original=JSON.stringify(base),empty=emptyNbaStatUpdates();
 const received=acceptSyntheticDelivery(empty,data,{testMode:true}),repeated=acceptSyntheticDelivery(received.updates,data,{testMode:true});assert.deepEqual(repeated.updates,received.updates);assert.equal(repeated.changes[0].reason,'DUPLICATE');assert.equal(Object.keys(empty.games).length,0);
 const combined=composeNbaStatView(base,repeated.updates).dataset,rows=filterRows(combined.records,{entity:'nba:player:990101',limit:20});assert.deepEqual(rows.map(r=>r.points),[20,12]);assert.equal(rows[0].minutes,24.5);
 for(const [stat,latest]of Object.entries({points:20,rebounds:4,assists:3,threeMade:1,pra:27,pr:24,pa:23,ra:7}))assert.equal(summarize(rows,stat,.5).data[0].value,latest);
 for(const n of[5,10,15,20,100,200])assert.equal(summarize(filterRows(combined.records,{entity:'nba:player:990101',limit:n}),'points',19.5).total,2);
 assert.equal(summarize(rows,'points',19.5).percent,50);assert.deepEqual(combined.records.filter(r=>r.kind==='team'),base.records.filter(r=>r.kind==='team'));assert.equal(JSON.stringify(base),original);assert.equal(data.games[0].dnp.length,1);assert.equal(combined.records.filter(r=>r.kind==='player').length,4);
});
test('Default, mixed real data, credentials, duplicate games and same-time inconsistent revisions are rejected',()=>{
 const data=packet();assert.throws(()=>acceptSyntheticDelivery(emptyNbaStatUpdates(),data),/desactivada/);
 assert.throws(()=>acceptSyntheticDelivery(emptyNbaStatUpdates(),{...data,games:[...data.games,...data.games]},{testMode:true}),/repetido/);
 assert.throws(()=>acceptSyntheticDelivery(emptyNbaStatUpdates(),{...data,token:'FICTITIOUS_SECRET'},{testMode:true}));
 const applied=acceptSyntheticDelivery(emptyNbaStatUpdates(),data,{testMode:true}).updates;
 assert.throws(()=>acceptSyntheticDelivery({...applied,games:{x:{synthetic:false}}},data,{testMode:true}),/reales/);
 assert.throws(()=>composeNbaStatView({...syntheticDeliveryHistory(data),meta:{mode:'imported',synthetic:false}},applied),/ficticias/);
 const changed=structuredClone(data);changed.games[0].records[0].assists++;assert.throws(()=>acceptSyntheticDelivery(applied,changed,{testMode:true}),/misma fecha/);
});
