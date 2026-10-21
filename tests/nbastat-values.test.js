import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {decodeNbaStatResponse,nbaStatIdentityChecklist} from '../scripts/lib/nbastat/decoder.mjs';
import {sealProbe,openProbe,runSealedProbe} from '../scripts/lib/nbastat/sealed-probe.mjs';
import {nbaStatWireFixture} from './fixtures/nbastat-wire.js';
import {nbaStatFixture} from './fixtures/nbastat.js';
import {prepareNbaStatGame,emptyNbaStatUpdates,applyNbaStatGame,composeNbaStatView} from '../src/data/nbastat/updates.js';
import {emptyLedger,HOUR} from '../scripts/lib/nbastat/client.mjs';
import {filterRows,summarize,detectTrends} from '../src/engine.js';
const config=JSON.parse(readFileSync(new URL('../nbastat-source.json',import.meta.url)));
const pass='FICTITIOUS_TEST_PASSWORD_32_CHARACTERS_MINIMUM';
const decodedFixture=()=>{const f=nbaStatWireFixture();return {...f,decoded:decodeNbaStatResponse(f.wire,f)};};
test('Confirmed wire fields decode without interpreting played, minutes, dates, DNP or percentages',()=>{
 const f=nbaStatWireFixture(),before=JSON.stringify(f.wire),d=decodeNbaStatResponse(f.wire);assert.equal(d.ready,false);assert.equal(d.reason,'VALUE_SEMANTICS_UNVERIFIED');assert.deepEqual(d.observed.participation,[7,9]);assert.equal(d.players[0].stats.rebounds,4);assert.equal(d.players[0].observed.minutes,'24:30');assert.equal(d.diagnostics.recordCount,3);assert.equal(d.diagnostics.pointTotalsMatch,true);assert.equal(d.diagnostics.quartersAvailable,false);assert.equal(d.diagnostics.percentagesInterpreted,false);assert.equal(JSON.stringify(f.wire),before);
 f.wire.data.players[0].made_up_percentage=42;assert.equal(decodeNbaStatResponse(f.wire).players[0].source.made_up_percentage,42);assert.ok(!Object.hasOwn(d.players[0],'played'));
});
test('Only explicit reviewed values convert; fixture uses 7/9 deliberately, never boolean coercion',()=>{
 const f=decodedFixture();assert.equal(f.decoded.ready,true);const b=prepareNbaStatGame(f.decoded.contract,f.mapping);assert.equal(b.ready,true);assert.equal(b.records.length,2);assert.equal(b.dnp.length,1);assert.equal(b.teamPending,true);assert.equal(b.records[0].minutes,24.5);assert.ok(!Object.hasOwn(f.decoded.contract,'teams'));assert.ok(b.records.every(r=>r.kind==='player'));
 f.wire.data.players[0].played=1;const pending=decodeNbaStatResponse(f.wire,f);assert.equal(pending.ready,false);assert.equal(pending.reason,'PARTICIPATION_OR_MINUTES_PENDING');
});
test('No guessed date/final status, null stats, minute units or DNP minutes',()=>{
 const f=nbaStatWireFixture();f.wire.data.game.status='FICTICIO_OTHER';assert.throws(()=>decodeNbaStatResponse(f.wire,f),/SEMANTICS_REVIEW_INVALID/);
 for(const minutes of [null,'24.5','24:99','DNP',' 24:30']){const f=nbaStatWireFixture();f.wire.data.players[0].minutes=minutes;assert.equal(decodeNbaStatResponse(f.wire,f).ready,false);}
 const decimal=nbaStatWireFixture();decimal.review.minutesFormat='decimal-string';decimal.wire.data.players[0].minutes='24.5';decimal.wire.data.players[1].minutes='24.5';assert.equal(decodeNbaStatResponse(decimal.wire,decimal).contract.players[0].stats.minutes,24.5);
 const dnp=nbaStatWireFixture();dnp.wire.data.players[2].minutes='DNP';assert.equal(decodeNbaStatResponse(dnp.wire,dnp).ready,false);dnp.review.dnpMinutes.push('DNP');assert.equal(decodeNbaStatResponse(dnp.wire,dnp).ready,true);
 for(const key of ['assists','free_throws_made','rebounds_offensive']){const missing=nbaStatWireFixture();missing.wire.data.players[0][key]=null;assert.equal(decodeNbaStatResponse(missing.wire,missing).ready,false);}
 const unreviewed=nbaStatWireFixture();unreviewed.review.complete=false;assert.throws(()=>decodeNbaStatResponse(unreviewed.wire,unreviewed),/SEMANTICS_REVIEW_INVALID/);
});
test('Zero-minute actual participation is retained only when reviewed; DNP positive stats rejected',()=>{
 const f=nbaStatWireFixture();const p=f.wire.data.players[0];for(const key of ['points','assists','rebounds_total','rebounds_offensive','rebounds_defensive','three_pointers_made','three_pointers_attempted','field_goals_made','field_goals_attempted','free_throws_made','free_throws_attempted','steals','blocks','turnovers'])p[key]=0;p.minutes='0:00';f.wire.data.game.home_score=0;assert.equal(decodeNbaStatResponse(f.wire,f).contract.players[0].played,true);
 const dnp=nbaStatWireFixture();dnp.wire.data.players[2].points=1;assert.throws(()=>decodeNbaStatResponse(dnp.wire,dnp),/DNP_STATS_CONTRADICTION/);
});
test('Reject duplicates, unknown teams, missing fields and incoherent score/shooting/rebounds',()=>{
 for(const mutate of [f=>f.wire.data.players.push(f.wire.data.players[0]),f=>f.wire.data.players[0].team_id=123,f=>delete f.wire.data.players[0].three_pointers_made]){const f=nbaStatWireFixture();mutate(f);assert.throws(()=>decodeNbaStatResponse(f.wire,f));}
 for(const mutate of [f=>f.wire.data.game.home_score++,f=>f.wire.data.players[0].rebounds_offensive++,f=>f.wire.data.players[0].free_throws_made++,f=>f.wire.data.players[0].assists=50]){const f=nbaStatWireFixture();mutate(f);const observed=decodeNbaStatResponse(f.wire);assert.ok(observed.diagnostics.pointTotalsMatch===false||observed.diagnostics.issues.length);assert.throws(()=>decodeNbaStatResponse(f.wire,f),/BOX_SCORE_ARITHMETIC/);}
});
test('Identity checklist never links by name or calls an unresolved ID a player without history',()=>{
 const f=decodedFixture(),parsed=decodeNbaStatResponse(f.wire),list=nbaStatIdentityChecklist(parsed);assert.equal(list.players.length,3);assert.ok(list.players.every(p=>p.status==='pending'&&p.historicalAvailability==='not-assessed'&&!p.key&&!p.birthDate));
 const pending=prepareNbaStatGame(f.decoded.contract,{...f.mapping,players:[]});assert.equal(pending.ready,false);assert.equal(pending.reason,'PENDING_PLAYERS');assert.ok(pending.pending.every(p=>p.reason==='IDENTITY_UNLINKED'));
 const wrong=structuredClone(f.mapping);wrong.players[0].sourceBirthDate='2000-02-02';assert.throws(()=>prepareNbaStatGame(f.decoded.contract,wrong),/nacimiento/);
});
test('Wire-to-graph fixture preserves original history and team results, deduplicates and accepts corrections',()=>{
 const f=decodedFixture(),batch=prepareNbaStatGame(f.decoded.contract,f.mapping),row=batch.records[0];
 const base={meta:{mode:'imported',synthetic:true,source:'FICTICIO'},records:Array.from({length:20},(_,i)=>({...row,id:'espn:game:'+String(880000+i)+':player:990101',sourceGameKey:'espn:game:'+String(880000+i),date:new Date(Date.UTC(2030,11,31-i,20)).toISOString(),team:i%2?'LAL':'BOS',points:10+i%5})),schedule:[]};const teamFixture=nbaStatFixture();base.records.push(...prepareNbaStatGame(teamFixture.contract,teamFixture.mapping).records.filter(r=>r.kind==='team').map(r=>({...r,id:'espn:game:879999:team:'+r.entityId,sourceGameKey:'espn:game:879999',date:'2030-12-25T20:00:00Z'})));const before=JSON.stringify(base);const teamSummaries=data=>['points','rebounds','assists','threeMade','allowed','margin','combined'].flatMap(stat=>['full','q1','q2','q3','q4','h1','h2'].map(period=>summarize(data.records.filter(r=>r.kind==='team'),stat,19.5,'over',period)));const originalTeamSummaries=teamSummaries(base);
 const state=applyNbaStatGame(emptyNbaStatUpdates(),batch).state;assert.equal(applyNbaStatGame(state,batch).reason,'DUPLICATE');const view=composeNbaStatView(base,state).dataset;
 for(const n of [5,10,15,20]){const rows=filterRows(view.records,{entity:row.entityId,limit:n});assert.equal(rows.length,n);assert.equal(rows[0].id,row.id);assert.ok(rows.some(r=>r.team==='LAL'));assert.equal(summarize(rows,'points',19.5).hits,1);}
 assert.equal(base.records.filter(r=>r.kind==='team').length,2);assert.deepEqual(teamSummaries(view),originalTeamSummaries);assert.deepEqual(view.records.filter(r=>r.kind==='team'),base.records.filter(r=>r.kind==='team'));assert.equal(JSON.stringify(base),before);
 assert.ok(detectTrends({...view,schedule:[{id:'FICTICIO',home:'BOS',away:'DET'}]},20,{stats:['points'],currentTeams:new Map([[row.entityId,'BOS']])}).some(t=>t.data.some(r=>r.id===row.id)));
 f.wire.data.players[0].points++;f.wire.data.players[0].free_throws_made++;f.wire.data.game.home_score++;f.receivedAt='2031-01-03T02:00:00Z';const revised=prepareNbaStatGame(decodeNbaStatResponse(f.wire,f).contract,f.mapping),next=applyNbaStatGame(state,revised);assert.equal(next.reason,'REVISION');assert.equal(next.state.games[batch.sourceGame].records.length,2);assert.equal(applyNbaStatGame(next.state,batch).reason,'OLDER_REVISION');assert.equal(JSON.stringify(base),before);
});
test('Encrypted sample authenticates ciphertext, wrong passwords/tampering fail, payload unchanged',()=>{
 const f=nbaStatWireFixture(),sealed=sealProbe({raw:f.wire},pass),text=JSON.stringify(sealed);assert.ok(!text.includes('FICTICIO'));assert.deepEqual(openProbe(sealed,pass).raw,f.wire);assert.throws(()=>openProbe(sealed,pass+'BAD'),/AUTH_FAILED/);const tampered={...sealed,ciphertext:Buffer.alloc(24).toString('base64')};assert.throws(()=>openProbe(tampered,pass),/AUTH_FAILED/);assert.throws(()=>sealProbe({},'short'),/PASSPHRASE/);
});
test('Private probe uses one fixed request, shared quota; no API token in encrypted package or returned logs',async()=>{
 let state=emptyLedger(),calls=0;const now=Date.parse('2031-01-03T00:00:00Z'),store={withLock:f=>f(),readLedger:async()=>state,writeLedger:async next=>{state=next;}},options={config,token:'FICTITIOUS_API_TOKEN',passphrase:pass,confirmation:'VALIDATE_1369',store,clock:()=>now,fetchImpl:async url=>{assert.equal(url.pathname,'/api/v1/games/1369/boxscore');assert.equal(state.attempts.length,1);calls++;return new Response(JSON.stringify(nbaStatWireFixture().wire));}};
 const result=await runSealedProbe(options);assert.equal(calls,1);assert.equal(result.status,'sealed-review');assert.ok(!JSON.stringify(result).includes('FICTICIO'));const opened=openProbe(result.sealed,pass);assert.ok(!JSON.stringify(opened).includes(options.token));assert.equal(opened.decoded.ready,false);assert.equal(opened.identityChecklist.players[0].status,'pending');
 state={version:1,attempts:Array(10).fill(now),blockedUntil:0};assert.equal((await runSealedProbe(options)).status,'deferred');assert.equal(calls,1);
 state=emptyLedger();await assert.rejects(runSealedProbe({...options,passphrase:'short'}),/PASSPHRASE/);assert.equal(calls,1);assert.equal(state.attempts.length,0);
 await assert.rejects(runSealedProbe({...options,fetchImpl:async()=>new Response('private',{status:429,headers:{'Retry-After':'7200'}})}),/HTTP_429/);assert.equal(state.blockedUntil,now+2*HOUR);
});
test('Private workflow never publishes cleartext or triggers automatically; original calendar unchanged',()=>{
 const wf=readFileSync(new URL('../.github/workflows/nbastat-values.yml',import.meta.url),'utf8');assert.ok(wf.includes('workflow_dispatch:'));assert.ok(wf.includes('group: nbastat-account-quota'));assert.ok(!/schedule:|pull_request:|^  push:/m.test(wf));assert.ok(wf.includes('secrets.NBASTAT_API_TOKEN'));assert.ok(wf.includes('secrets.NBASTAT_PROBE_PASSPHRASE'));assert.ok(wf.includes('path: work/nbastat-sealed/review.sealed.json'));assert.ok(wf.includes('retention-days: 1'));assert.ok(!wf.includes('deploy-pages'));assert.equal(config.enabled,false);assert.equal(config.responseSchema,'unverified');
});
