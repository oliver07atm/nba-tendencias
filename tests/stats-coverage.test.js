import test from 'node:test';
import assert from 'node:assert/strict';
import {statsCoverage} from '../src/data/stats-coverage.js';
import {summarize,detectTrends} from '../src/engine.js';
import {refreshCalendar} from '../scripts/lib/balldontlie.mjs';
// Synthetic fixtures only: not real NBA results or performances.
const date='2026-10-21T00:30:00Z';
const game=(id=999991,extra={})=>({id:`bdl:game:${id}`,home:'BOS',away:'DET',date,day:'2026-10-21',status:'final',homeScore:100,awayScore:96,...extra});
const snapshot=games=>({meta:{source:'BALLDONTLIE',updatedAt:'2026-10-21T09:00:00Z'},games});
const row=(kind,team,points,extra={})=>({id:`espn:game:999991:${kind}:${team}`,entityId:kind==='team'?team:`espn:player:${team==='BOS'?'999991':'999992'}`,entity:kind==='team'?team:'Jugador sintético '+team,kind,team,opponent:team==='BOS'?'DET':'BOS',venue:team==='BOS'?'home':'away',season:'2026-27',competition:'NBA',date,points,rebounds:5,assists:4,threeMade:1,quarters:[25,25,25,points-75],opponentQuarters:team==='BOS'?[24,24,24,24]:[25,25,25,25],...extra});
const complete=()=>[row('team','BOS',100),row('team','DET',96),row('player','BOS',100),row('player','DET',96)];
test('Un final nuevo no se incorpora a los históricos ni se transforma en actuaciones a cero',()=>{
 const records=complete().map(r=>({...r,date:'2026-06-01T00:30:00Z',season:'2025-26'})),before=JSON.stringify(records);
 const report=statsCoverage(records,snapshot([game()]));assert.equal(report.unresolved,1);assert.equal(report.finals[0].state,'missing');assert.equal(report.finals[0].playerRecords,0);assert.equal(report.latestPlayer,'2026-06-01T00:30:00.000Z');assert.equal(JSON.stringify(records),before);
});
test('Cruza franquicias/día/localía sin equiparar IDs numéricos ESPN/BDL ni inventar DNP',()=>{
 const report=statsCoverage(complete(),snapshot([game(888881)]));assert.equal(report.finals[0].state,'compatible');assert.equal(report.finals[0].sourceGameId,'espn:game:999991');assert.equal(report.finals[0].playerRecords,2);
 const reversed=game(888882,{home:'DET',away:'BOS'});assert.equal(statsCoverage(complete(),snapshot([reversed])).finals[0].state,'missing');
 const noIds=complete().map(r=>({...r,id:'legacy-'+r.id,gameId:'888881'}));assert.equal(statsCoverage(noIds,snapshot([game(888881)])).finals[0].state,'missing');
 const alias=complete().map(r=>({...r,team:r.team==='BOS'?'BRK':r.team,opponent:r.opponent==='BOS'?'BRK':r.opponent}));assert.equal(statsCoverage(alias,snapshot([game(888881,{home:'BKN'})])).finals[0].state,'compatible');
});
test('No certifica cobertura cuando faltan equipos/jugadores o hay marcadores discrepantes',()=>{
 const rows=complete(),check=r=>statsCoverage(r,snapshot([game()])).finals[0].state;
 assert.equal(check(rows.slice(0,2)),'partial');assert.equal(check(rows.slice(1)),'partial');
 assert.equal(check(rows.map(r=>r.kind==='team'?{...r,points:r.points+1}:r)),'score-conflict');
 assert.equal(check(rows.map(r=>r.kind==='player'?{...r,points:r.points-1}:r)),'player-points-conflict');
 assert.equal(statsCoverage(rows,snapshot([game(999991,{homeScore:null})])).finals[0].state,'unknown-score');
});
test('Fechas sin hora y varios IDs para el mismo cruce quedan pendientes de revisión',()=>{
 assert.equal(statsCoverage(complete(),snapshot([game(999991,{date:null})])).finals[0].state,'ambiguous');
 const duplicate=complete().map(r=>({...r,id:r.id.replace('999991:','999992:')}));assert.equal(statsCoverage([...complete(),...duplicate],snapshot([game()])).finals[0].state,'ambiguous');
 assert.equal(statsCoverage([],snapshot([game(999991,{date:null})])).finals[0].state,'unknown-time');
 assert.equal(statsCoverage(complete(),snapshot([game(999991,{status:'scheduled'})])).finals.length,0);
});
test('Demostración nunca se considera cobertura real; el diagnóstico no altera gráficos ni tendencias',()=>{
 const records=complete(),s=snapshot([game()]),before=JSON.stringify({records,s}),summary=summarize(records.filter(r=>r.kind==='team'),'points',24.5,'over','q1');
 const trends=detectTrends({records,schedule:[]},20);
 assert.equal(statsCoverage(records,s,{mode:'demo'}).finals[0].state,'demo');assert.equal(statsCoverage(records,s,{mode:'demo'}).latestPlayer,null);
 statsCoverage(records,s);assert.deepEqual(summarize(records.filter(r=>r.kind==='team'),'points',24.5,'over','q1'),summary);assert.deepEqual(detectTrends({records,schedule:[]},20),trends);assert.equal(JSON.stringify({records,s}),before);
});
const raw=(id,extra={})=>({id,date:'2026-10-21',datetime:date,status:'Final',home_team:{id:2,abbreviation:'BOS'},visitor_team:{id:9,abbreviation:'DET'},home_team_score:100,visitor_team_score:96,...extra});
const runtime=raws=>{let calls=0;return {fetchImpl:async url=>{assert.equal(new URL(url).pathname,'/v1/games');calls++;return new Response(JSON.stringify({data:raws,meta:{next_cursor:null}}));},wait:async()=>{},clock:()=>0,get calls(){return calls;}};};
test('Conserva finales de la temporada fuera de la ventana al volver tras semanas, sin peticiones de estadísticas',async()=>{
 const previous=snapshot([game(777771,{day:'2026-10-02',date:'2026-10-02T20:00:00Z'}),game(777772,{day:'2026-06-02',date:'2026-06-02T20:00:00Z'}),game(777773,{status:'scheduled',day:'2026-10-03',date:'2026-10-03T20:00:00Z'})]),before=JSON.stringify(previous),rt=runtime([raw(999991)]);
 const result=await refreshCalendar({previous,now:new Date('2026-10-21T10:00:00Z'),apiKey:'synthetic-test',...rt});assert.equal(result.ok,true);assert.deepEqual(result.snapshot.games.map(g=>g.id),['bdl:game:777772','bdl:game:777771','bdl:game:777773','bdl:game:999991']);assert.equal(result.snapshot.meta.archive.retainedFinals,2);assert.equal(rt.calls,1);assert.equal(JSON.stringify(previous),before);
 assert.equal(result.snapshot.games[0].observedAt,previous.meta.updatedAt);assert.equal(result.snapshot.games.at(-1).observedAt,'2026-10-21T10:00:00.000Z');
 const again=await refreshCalendar({previous:{...result.snapshot,meta:{...result.snapshot.meta,seasonScan:null}},now:new Date('2026-10-21T10:00:00Z'),apiKey:'synthetic-test',...runtime([raw(999991)])});assert.deepEqual(again.snapshot.games,result.snapshot.games);
});
test('Las revisiones del calendario reemplazan el mismo ID y no conservan un final obsoleto',async()=>{
 const previous=snapshot([game()]);
 for(const change of [{home_team_score:102},{status:'Postponed'}]){
  const result=await refreshCalendar({previous,now:new Date('2026-10-21T10:00:00Z'),apiKey:'synthetic-test',...runtime([raw(999991,change)])});assert.equal(result.ok,true);assert.equal(result.snapshot.games.length,1);
  if(change.status)assert.equal(result.snapshot.games[0].status,'postponed');else assert.equal(result.snapshot.games[0].homeScore,102);
 }
});
