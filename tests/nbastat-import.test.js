import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {indexedDB} from 'fake-indexeddb';
import {privateImportFixture} from './fixtures/nbastat-private-import.js';
import {readPrivateReview,previewPrivate1369,mergeNbaStatMappings} from '../src/data/nbastat/import.js';
import {emptyNbaStatUpdates,applyNbaStatGame,composeNbaStatView} from '../src/data/nbastat/updates.js';
import {loadNbaStatSnapshot,saveNbaStatSnapshot,emptyNbaStatSnapshot} from '../src/data/nbastat/store.js';
import {saveHistory,loadHistory} from '../src/data/history-store.js';import {saveRosters,loadRosters} from '../src/data/roster-store.js';import {saveDirectory,loadDirectory} from '../src/data/directory-store.js';import {rosterTemplate} from '../src/data/rosters.js';import {emptyDirectory,visiblePlayerOptions} from '../src/data/player-directory.js';
import {statsCoverage} from '../src/data/stats-coverage.js';
import {filterRows,summarize,detectTrends} from '../src/engine.js';
const preview=f=>previewPrivate1369(f.file,f);
test('Private review recomputes raw structure, ignores forged cached decoder and rejects credentials/encrypted files',()=>{
 const f=privateImportFixture();f.file.decoded={ready:true,FAKE:'untrusted'};assert.equal(readPrivateReview(f.file).parsed.ready,false);assert.throws(()=>readPrivateReview({version:1,ciphertext:'x'}),/descifrado/);f.file.token='NO_REAL_SECRET';assert.throws(()=>readPrivateReview(f.file),/credenciales/);
});
test('1369 preview validates all 35 rows; 22 played and 13 null/empty minute DNPs never become records',()=>{
 const f=privateImportFixture(),p=preview(f);assert.equal(p.ready,true);assert.equal(p.batch.records.length,22);assert.equal(p.batch.dnp.length,13);assert.equal(p.batch.teamPending,true);assert.ok(p.batch.synthetic);assert.ok(p.batch.records.every(r=>r.kind==='player'&&r.minutes===35+17/60&&r.source.includes('FICTICIA')));assert.equal(p.table.length,35);assert.equal(previewPrivate1369(f.file).reason,'REVIEW_REQUIRED');
 assert.equal(p.batch.records.filter(r=>r.team==='DET').reduce((s,r)=>s+r.points,0),121);assert.equal(p.batch.records.filter(r=>r.team==='BOS').reduce((s,r)=>s+r.points,0),113);
});
test('Unknown participation/status/DNP, corrupt totals/fields/date and duplicate IDs cannot be imported',()=>{
 for(const mutate of [f=>f.file.raw.data.game.id=1370,f=>f.file.raw.data.game.home_score=122,f=>f.file.raw.data.players[0].played=2,f=>f.file.raw.data.players[0].status='UNKNOWN',f=>f.file.raw.data.players[11].minutes='1:00',f=>f.file.raw.data.players[11].not_playing_reason=null,f=>f.file.raw.data.players[0].points++,f=>f.file.raw.data.players[0].player_id=f.file.raw.data.players[1].player_id,f=>delete f.file.raw.data.players[0].rebounds_total,f=>f.date='2026-10-21 00:30:00']){const f=privateImportFixture();mutate(f);assert.throws(()=>preview(f));}
});
test('Partial identities retain full-game coherence but import only linked performances, not fake zeroes',()=>{
 const f=privateImportFixture();f.mappings.players=f.mappings.players.slice(0,1);const p=preview(f);assert.equal(p.ready,true);assert.equal(p.batch.records.length,1);assert.equal(p.pending.length,21);assert.equal(p.batch.pendingIdentities.length,21);assert.equal(p.dnp.length,13);
 const none=privateImportFixture();none.mappings.players=[];assert.equal(preview(none).ready,false);
 const bad=privateImportFixture();bad.mappings.players=bad.mappings.players.slice(0,1);bad.file.raw.data.players[20].points++;assert.throws(()=>preview(bad));
});
test('Mappings require IDs, profiles, matching DOB, known identities and no alias collisions',()=>{
 const f=privateImportFixture(),context={knownKeys:new Set(f.mappings.players.map(p=>p.key)),birthDates:new Map([[f.mappings.players[0].key,'2000-01-02']])};assert.throws(()=>mergeNbaStatMappings({version:1,players:[],teams:[]},f.mappings,context),/nacimiento/);
 const wrong=privateImportFixture();wrong.mappings.players[0].sourceBirthDate='1999-01-01';assert.throws(()=>preview(wrong),/nacimiento/);
 const nameOnly=privateImportFixture();delete nameOnly.mappings.players[0].canonicalUrl;assert.throws(()=>preview(nameOnly),/evidencias/);
 const p=f.mappings.players[0],second={...f.mappings.players[1],key:'espn:player:990999',canonicalUrl:'https://www.espn.com/nba/player/_/id/990999'};assert.throws(()=>mergeNbaStatMappings({version:1,players:[],teams:[]},{...f.mappings,players:[p,second]},{aliases:new Map([[second.key,p.key]])}),/misma identidad/);
 assert.throws(()=>mergeNbaStatMappings({version:1,players:[],teams:[]},f.mappings,{knownKeys:new Set()}),/no está/);
});
test('Same receipt may add newly verified identities without duplicating previous player rows',()=>{
 const f=privateImportFixture(),all=f.mappings.players;f.mappings.players=all.slice(0,1);const first=preview(f).batch,state=applyNbaStatGame(emptyNbaStatUpdates(),first).state;f.mappings.players=all;
 const enriched=preview(f).batch;const changed=applyNbaStatGame(state,enriched);assert.equal(changed.applied,true);assert.equal(changed.state.games[first.sourceGame].records.length,22);assert.equal(applyNbaStatGame(changed.state,enriched).reason,'DUPLICATE');
});
test('Source corrections replace a game, stale/diminished revisions fail, original team totals and trends unchanged',()=>{
 const f=privateImportFixture(),p=preview(f),batch=p.batch,row=batch.records[0],history={meta:{mode:'imported',synthetic:true,source:'FICTICIO'},records:Array.from({length:20},(_,i)=>({...row,id:'espn:game:'+String(880000+i)+':player:990100',sourceGameKey:'espn:game:'+String(880000+i),team:i%2?'LAL':'DET',date:new Date(Date.UTC(2026,9,19-i,20)).toISOString(),points:10})),schedule:[]};
 // Meaningful pre-existing quarter/team record: never derived from the new player batch.
 const team={...row,id:'espn:game:879999:team:DET',sourceGameKey:'espn:game:879999',entityId:'DET',entity:'DET',kind:'team',points:100,quarters:[25,25,25,25],opponentQuarters:[20,20,20,20],opponentStats:{...row,points:80},date:'2026-10-01T20:00:00Z'};history.records.push(team);const before=JSON.stringify(history),state=applyNbaStatGame(emptyNbaStatUpdates(),batch).state,view=composeNbaStatView(history,state).dataset;
 for(const limit of [5,10,15,20]){const rows=filterRows(view.records.filter(r=>r.kind==='player'),{entity:row.entityId,limit});assert.equal(rows.length,limit);assert.equal(rows[0].id,row.id);for(const stat of ['points','rebounds','assists','threeMade','pra','pr','pa','ra'])assert.equal(summarize(rows,stat,0.5).total,limit);assert.ok(rows.some(r=>r.team==='LAL'));}
 const teams=records=>records.filter(r=>r.kind==='team');for(const stat of ['points','allowed','margin','combined','assists','rebounds','threeMade'])for(const period of ['full','q1','q2','h1','h2'])assert.deepEqual(summarize(teams(view.records),stat,29.5,'over',period),summarize(teams(history.records),stat,29.5,'over',period));
 const future=[{id:'FICTICIO',home:'DET',away:'BOS'}],teamTrends=d=>detectTrends({...d,schedule:future},20,{kind:'team',stats:['points','assists','threeMade']}).filter(t=>t.kind==='team');assert.deepEqual(teamTrends(view),teamTrends(history));assert.ok(!visiblePlayerOptions(view.records,new Set([row.entityId])).some(p=>p.id===row.entityId));assert.equal(JSON.stringify(history),before);
 f.file.receivedAt='2026-10-21T13:00:00Z';f.file.raw.data.players[0].assists++;const revised=preview(f).batch,updated=applyNbaStatGame(state,revised);assert.equal(updated.reason,'REVISION');assert.equal(updated.state.games[batch.sourceGame].records.length,22);assert.equal(applyNbaStatGame(updated.state,batch).reason,'OLDER_REVISION');f.mappings.players=f.mappings.players.slice(0,1);f.file.receivedAt='2026-10-21T14:00:00Z';assert.throws(()=>applyNbaStatGame(updated.state,preview(f).batch),/No se pierde/);
});
test('NBA Stat saves and reloads in its own database; original three databases remain byte-for-byte unchanged',async()=>{
 globalThis.indexedDB=indexedDB;const f=privateImportFixture(),p=preview(f),snapshot=emptyNbaStatSnapshot();const data={meta:{mode:'imported',synthetic:true,source:'FICTICIO'},records:p.batch.records,schedule:[]};await saveHistory(data);await saveRosters(rosterTemplate());await saveDirectory(emptyDirectory());const before=JSON.stringify([await loadHistory(),await loadRosters(),await loadDirectory()]);snapshot.updates=applyNbaStatGame(snapshot.updates,p.batch).state;snapshot.mappings=p.mappings;const revision=await saveNbaStatSnapshot(snapshot,0),saved=await loadNbaStatSnapshot();assert.equal(saved.revision,revision);assert.equal(saved.updates.games['nbastat:game:1369'].dnp.length,13);assert.equal(JSON.stringify([await loadHistory(),await loadRosters(),await loadDirectory()]),before);await assert.rejects(saveNbaStatSnapshot(snapshot,0),/Otra pestaña/);
});
test('Browser decoder contains no authenticated client, secret or Node dependencies',()=>{
 for(const file of ['decoder.js','import.js']){const s=readFileSync(new URL('../src/data/nbastat/'+file,import.meta.url),'utf8');assert.ok(!/node:|process\.env|Authorization|fetch\(|scripts\/lib|SERVER_ONLY/.test(s));}
});

test('Calendar diagnostics recognize NBA Stat player rows but keep missing teams/quarters marked partial',()=>{
 const f=privateImportFixture(),p=preview(f),g={id:'bdl:game:990000',home:'DET',away:'BOS',date:f.date,day:'2026-10-21',status:'final',homeScore:121,awayScore:113};
 const coverage=statsCoverage(p.batch.records,{games:[g],meta:{updatedAt:f.date}});assert.equal(coverage.finals[0].state,'partial');assert.equal(coverage.finals[0].playerRecords,22);assert.equal(coverage.finals[0].teamRecords,0);assert.equal(coverage.compatible,0);
});
