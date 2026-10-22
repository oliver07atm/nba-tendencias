import {test} from 'node:test';
import assert from 'node:assert/strict';
import {privateImportFixture} from './fixtures/nbastat-private-import.js';
import {inspectGameLink,approveGameLink,validateGameLink,mergeGameLinks,queueGameLink,inspectGameLinkBatch} from '../src/data/nbastat/game-links.js';
import {indexedDB} from 'fake-indexeddb';
import {loadGameLinks,saveGameLink} from '../src/data/nbastat/game-link-store.js';
function fixture(){const {file}=privateImportFixture();const g=file.raw.data.game;const c={id:'bdl:game:999999',sourceId:999999,home:'DET',away:'BOS',date:g.scheduled,day:'2026-10-21',sourceDate:'2026-10-20',status:'final',homeScore:121,awayScore:113,season:2026,competition:'NBA',source:'BALLDONTLIE',observedAt:file.receivedAt};return {file,calendar:{meta:{source:'BALLDONTLIE',updatedAt:file.receivedAt},games:[c]},evidence:{version:1,provenanceReference:'private-fixture:synthetic-response',semanticsReference:'private-fixture:documented-values',finalStatus:g.status,seasonValue:g.season,seasonYear:2026,competition:'NBA',teams:[{sourceId:g.home_team_id,code:'DET',reference:'private-fixture:explicit-team-ID-home'},{sourceId:g.away_team_id,code:'BOS',reference:'private-fixture:explicit-team-ID-away'}]}};}
test('local evidence gate, explicit approval and no source mutation',()=>{const f=fixture(),before=JSON.stringify(f);const result=inspectGameLink(f.file,f.calendar,f.evidence);assert.equal(result.status,'eligible');assert.throws(()=>approveGameLink(result));const link=approveGameLink(result,{confirmed:true});assert.equal(validateGameLink(link,f.calendar),link);assert.equal(JSON.stringify(f),before);assert.throws(()=>queueGameLink(link,f.calendar),/ficticio/);assert.equal(mergeGameLinks([link],[link],f.calendar).length,1);});
test('missing independent evidence, timezone, wrong score, swapped teams and ambiguous games remain pending',()=>{for(const mutate of [f=>f.evidence=null,f=>f.file.raw.data.game.scheduled='2026-10-21 00:30',f=>f.calendar.games[0].homeScore++,f=>f.evidence.teams.reverse().forEach((t,i)=>t.code=['DET','BOS'][i]),f=>f.calendar.games.push({...f.calendar.games[0],id:'bdl:game:999998',sourceId:999998})]){const f=fixture();mutate(f);assert.equal(inspectGameLink(f.file,f.calendar,f.evidence).status,'pending');}});
test('corrected calendar invalidates link but observation timestamp does not',()=>{const f=fixture(),l=approveGameLink(inspectGameLink(f.file,f.calendar,f.evidence),{confirmed:true});f.calendar.games[0].observedAt='2026-10-22T12:00:00Z';assert.doesNotThrow(()=>validateGameLink(l,f.calendar));f.calendar.games[0].date='2026-10-21T01:30:00Z';assert.throws(()=>validateGameLink(l,f.calendar));});
test('separate local database persists game link, rejects conflicting IDs',async()=>{globalThis.indexedDB=indexedDB;const f=fixture(),l=approveGameLink(inspectGameLink(f.file,f.calendar,f.evidence),{confirmed:true});await saveGameLink(l);assert.deepEqual(await loadGameLinks(),[l]);await assert.rejects(saveGameLink({...l,calendar:{...l.calendar,id:'bdl:game:999998'}}));assert.deepEqual(await loadGameLinks(),[l]);});

test("offline batch proposals detect duplicate IDs without approving",()=>{const f=fixture();assert.equal(inspectGameLinkBatch([f.file],f.calendar,f.evidence)[0].status,"eligible");assert.ok(inspectGameLinkBatch([f.file,f.file],f.calendar,f.evidence).every(r=>r.status==="pending"&&r.reasons.includes("BATCH_ID_CONFLICT")));});

test('declared date links preserve unknown provider time, use sourceDate not Canary day and require approval',()=>{
 const f=fixture();f.file.raw.data.game.scheduled='2026-10-20 19:00:00';
 f.evidence.dateMethod='declared-date';f.evidence.dateSemanticsConfirmed=true;
 const before=JSON.stringify(f),r=inspectGameLink(f.file,f.calendar,f.evidence);
 assert.equal(r.status,'eligible');assert.throws(()=>approveGameLink(r));
 const link=approveGameLink(r,{confirmed:true});assert.equal(validateGameLink(link,f.calendar),link);
 assert.equal(link.source.scheduled,'2026-10-20 19:00:00');assert.equal(JSON.stringify(f),before);
 f.calendar.games.push({...f.calendar.games[0],id:'bdl:game:999998',sourceId:999998,homeScore:120});
 assert.ok(inspectGameLink(f.file,f.calendar,f.evidence).reasons.includes('AMBIGUOUS_DECLARED_DATE'));assert.throws(()=>validateGameLink(link,f.calendar));
});
test('declared date rejects invalid dates, missing calendar dates, wrong home/away and unreviewed semantics',()=>{
 for(const change of [f=>f.file.raw.data.game.game_date='2026-02-30',f=>delete f.calendar.games[0].sourceDate,f=>f.evidence.dateSemanticsConfirmed=false,f=>f.calendar.games[0].sourceDate='2026-10-21',f=>[f.calendar.games[0].home,f.calendar.games[0].away]=['BOS','DET']]){
  const f=fixture();f.evidence.dateMethod='declared-date';f.evidence.dateSemanticsConfirmed=true;change(f);assert.equal(inspectGameLink(f.file,f.calendar,f.evidence).status,'pending');
 }
});

test('original row consensus proposes franchise IDs without fuzzy matching and feeds private preview',async()=>{
 const {observedTeamEvidence}=await import('../src/data/nbastat/game-links.js');
 const {previewPrivate1369}=await import('../src/data/nbastat/import.js');
 const f=fixture();for(const p of f.file.raw.data.players)p.team_name=String(p.team_id)===String(f.file.raw.data.game.home_team_id)?'Detroit Pistons':'Boston Celtics';
 assert.deepEqual(observedTeamEvidence(f.file).map(t=>[t.code,t.rows]),[['DET',18],['BOS',17]]);
 f.evidence.teamMethod='source-row-consensus';f.evidence.dateMethod='declared-date';f.evidence.dateSemanticsConfirmed=true;f.file.raw.data.game.scheduled='2026-10-20 19:00:00';
 const link=approveGameLink(inspectGameLink(f.file,f.calendar,f.evidence),{confirmed:true});
 const before=JSON.stringify(f.file),result=previewPrivate1369(f.file,{gameLink:link,calendar:f.calendar,confirmed:true});
 assert.equal(result.pending.length,22);assert.equal(result.dnp.length,13);assert.equal(JSON.stringify(f.file),before);
 f.file.raw.data.players[0].team_name='Boston Celtics';
 assert.ok(inspectGameLink(f.file,f.calendar,f.evidence).reasons.includes('SOURCE_TEAM_ROWS_UNRESOLVED'));
 assert.throws(()=>previewPrivate1369(f.file,{gameLink:link,calendar:f.calendar,confirmed:true}));
});

test('reviewed declared-date link plus verified fictitious player IDs yields exactly 22 appearances',()=>{
 const f=fixture(),mapped=privateImportFixture();f.evidence.dateMethod='declared-date';f.evidence.dateSemanticsConfirmed=true;f.file.raw.data.game.scheduled='2026-10-20 19:00:00';
 const link=approveGameLink(inspectGameLink(f.file,f.calendar,f.evidence),{confirmed:true});
 return import('../src/data/nbastat/import.js').then(({previewPrivate1369})=>{
  const before=JSON.stringify(f.file),r=previewPrivate1369(f.file,{gameLink:link,calendar:f.calendar,confirmed:true,mappings:mapped.mappings});
  assert.equal(r.ready,true);assert.equal(r.batch.records.length,22);assert.equal(r.pending.length,0);assert.equal(r.dnp.length,13);
  assert.ok(r.batch.records.every(row=>row.date===link.calendar.date&&row.minutes>0));assert.equal(JSON.stringify(f.file),before);
 });
});

test('all 30 exact official nicknames and full names resolve uniquely, preserving original evidence',async()=>{
 const {NBA_TEAMS,exactTeamName}=await import('../src/data/nba-teams.js');const {observedTeamEvidence}=await import('../src/data/nbastat/game-links.js');
 assert.equal(NBA_TEAMS.length,30);assert.equal(new Set(NBA_TEAMS.map(t=>t.nickname)).size,30);
 for(const team of NBA_TEAMS){const f=fixture(),other=NBA_TEAMS.find(t=>t.id!==team.id);for(const [i,p] of f.file.raw.data.players.entries())p.team_name=String(p.team_id)===String(f.file.raw.data.game.home_team_id)?(i%2?team.name:team.nickname):other.nickname;
  const before=JSON.stringify(f.file),rows=observedTeamEvidence(f.file);assert.equal(rows[0].code,team.id);assert.equal(rows[1].code,other.id);assert.ok(rows[0].names.includes(team.nickname));assert.ok(rows[0].names.includes(team.name));assert.equal(exactTeamName(team.nickname),team.id);assert.equal(JSON.stringify(f.file),before);
 }
 for(const label of ['LA','Los Angeles','New York','Portland','Blazers','Piston','Celtic','pistons',' Pistons ',null,undefined,''])assert.equal(exactTeamName(label),null);
});
test('nickname consensus enables only a proposal and does not bypass independent match checks',async()=>{
 const {observedTeamEvidence}=await import('../src/data/nbastat/game-links.js');
 const make=()=>{const f=fixture();for(const p of f.file.raw.data.players)p.team_name=String(p.team_id)===String(f.file.raw.data.game.home_team_id)?'Pistons':'Celtics';f.evidence.teamMethod='source-row-consensus';return f;};
 const f=make();assert.deepEqual(observedTeamEvidence(f.file).map(t=>[t.code,t.rows,t.names]),[['DET',18,['Pistons']],['BOS',17,['Celtics']]]);const proposal=inspectGameLink(f.file,f.calendar,f.evidence);assert.equal(proposal.status,'eligible');assert.throws(()=>approveGameLink(proposal));
 for(const mutate of [f=>f.file.raw.data.players[0].team_name='Celtics',f=>f.file.raw.data.players[0].team_name='Piston',f=>f.file.raw.data.players.forEach(p=>p.team_name='Pistons'),f=>f.calendar.games[0].homeScore++,f=>f.calendar.games[0].season++,f=>f.calendar.games[0].status='scheduled',f=>Object.assign(f.calendar.games[0],{date:'2026-10-22T00:30:00Z',day:'2026-10-22'}),f=>f.calendar.games.push({...f.calendar.games[0],id:'bdl:game:999998',sourceId:999998})]){const bad=make();mutate(bad);assert.equal(inspectGameLink(bad.file,bad.calendar,bad.evidence).status,'pending');}
});
