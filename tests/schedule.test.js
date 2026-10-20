import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NBA_TEAMS,ballTeam,canonicalTeam,canonicalRecords} from '../src/data/nba-teams.js';
import {normalizeGame,gameState,canaryDay,addDays,validateSchedule,calendarWarning,upcomingGames} from '../src/data/schedule.js';
import {fetchCalendar,refreshCalendar} from '../scripts/lib/balldontlie.mjs';
import {fixture} from './fixtures/hoopr.js';
import {convertHoopr} from '../src/data/hoopr.js';
import {detectTrends,filterRows} from '../src/engine.js';
// All match values below are synthetic; no API key or real historical records.
const now=new Date('2026-10-20T10:00:00Z');
const raw=(id=900001,extra={})=>({id,date:'2026-10-20',datetime:'2026-10-20T23:30:00Z',status:'7:30 pm ET',period:0,home_team:{id:2,abbreviation:'BOS'},visitor_team:{id:14,abbreviation:'LAL'},home_team_score:0,visitor_team_score:0,...extra});
const response=(data,next=null)=>new Response(JSON.stringify({data,meta:{next_cursor:next}}),{status:200});
function mockRuntime(replies){let ms=0;const calls=[],waits=[];return {calls,waits,clock:()=>ms,wait:async n=>{waits.push(n);ms+=n;},fetchImpl:async(url,options)=>{calls.push({url:new URL(url),options,at:ms});const next=replies.shift();if(next instanceof Error)throw next;return next;}};}
test('Normaliza las 30 franquicias sin confundir IDs ESPN y BALLDONTLIE',()=>{
 assert.equal(NBA_TEAMS.length,30);for(const t of NBA_TEAMS)assert.equal(ballTeam({id:t.sourceId,abbreviation:t.id}),t.id);
 assert.equal(ballTeam({id:14,abbreviation:'LAL'}),'LAL');assert.throws(()=>ballTeam({id:13,abbreviation:'LAL'}));assert.equal(canonicalTeam('brk'),'BKN');
 const rows=[{kind:'team',team:'BRK',opponent:'GS',entity:'BRK',entityId:'BRK'}],before=JSON.stringify(rows);assert.equal(canonicalRecords(rows)[0].team,'BKN');assert.equal(canonicalRecords(rows)[0].opponent,'GSW');assert.equal(JSON.stringify(rows),before);
});
test('Agrupa por día de Canarias, con cambios de hora, sin inventar hora si falta',()=>{
 assert.equal(canaryDay('2026-10-20T23:30:00Z'),'2026-10-21');assert.equal(canaryDay('2026-12-20T23:30:00Z'),'2026-12-20');assert.equal(addDays('2026-12-31',1),'2027-01-01');
 const g=normalizeGame(raw());assert.equal(g.day,'2026-10-21');assert.equal(g.homeScore,null);assert.equal(g.id,'bdl:game:900001');
 const missing=normalizeGame(raw(900002,{datetime:null}));assert.equal(missing.date,null);assert.equal(missing.day,'2026-10-20');
 assert.throws(()=>normalizeGame(raw(900002,{date:'incorrecta'})));assert.throws(()=>normalizeGame(raw(900002,{home_team:{id:13,abbreviation:'LAL'}})));
});
test('Respeta status_state y distingue final, en juego, pendiente, aplazado y desconocido',()=>{
 for(const state of ['scheduled','in_progress','final','postponed','delayed','canceled','suspended','unknown'])assert.equal(gameState({status_state:state,status:'Final'}),state);
 assert.equal(gameState({status_state:'scheduled',postponed:true}),'postponed');
 for(const [status,expected]of[['Final/OT','final'],['2nd Qtr','in_progress'],['Halftime','in_progress'],['7:30 pm ET','scheduled'],['TBD','scheduled'],['misterio','unknown']])assert.equal(gameState({status}),expected);
 assert.equal(normalizeGame(raw(900003,{status_state:'final',home_team_score:101,visitor_team_score:99})).homeScore,101);
});
test('Pagina GET /v1/games, deduplica, ordena y espacia todas las peticiones',async()=>{
 const pages=[response([raw(900002)],88),response([raw(900001,{datetime:'2026-10-20T21:00:00Z'}),raw(900002)],99),new Response(JSON.stringify({data:[],meta:{per_page:100}}))];
 const rt=mockRuntime(pages),s=await fetchCalendar({apiKey:'synthetic-secret',now,...rt});assert.equal(s.games.length,2);assert.equal(s.games[0].id,'bdl:game:900001');assert.equal(s.meta.requests,3);
 assert.deepEqual(rt.calls.map(c=>c.at),[0,13000,26000]);assert.equal(rt.calls[1].url.searchParams.get('cursor'),'88');
 for(const c of rt.calls){assert.equal(c.url.origin,'https://api.balldontlie.io');assert.equal(c.url.pathname,'/v1/games');assert.equal(c.url.searchParams.get('per_page'),'100');assert.equal(c.options.headers.Authorization,'synthetic-secret');assert.equal(c.options.redirect,'error');assert.equal(c.url.href.includes('secret'),false);assert.equal(c.url.searchParams.get('start_date'),'2026-10-12');}
 assert.equal(JSON.stringify(s).includes('synthetic-secret'),false);
});
test('429 y errores temporales reintentan respetando el límite, sin exponer respuestas',async()=>{
 const rt=mockRuntime([new Response('DO NOT LOG',{status:429,headers:{'retry-after':'60'}}),new Response('DO NOT LOG',{status:503}),response([raw()])]);
 const s=await fetchCalendar({apiKey:'synthetic-secret',now,...rt});assert.equal(s.games.length,1);assert.deepEqual(rt.calls.map(c=>c.at),[0,60000,120000]);
});
test('Fallo de autenticación conserva íntegro el último calendario y su fecha',async()=>{
 const previous=await fetchCalendar({apiKey:'synthetic-secret',now,...mockRuntime([response([raw()])])}),before=JSON.stringify(previous);
 for(const status of [401,403,429,503]){
  const replies=Array.from({length:3},()=>new Response('could contain credentials',{status}));const r=await refreshCalendar({apiKey:'synthetic-secret',previous,now:new Date('2026-10-21T10:00:00Z'),...mockRuntime(replies)});
  assert.equal(r.ok,false);assert.deepEqual(r.snapshot.games,previous.games);assert.equal(r.snapshot.meta.updatedAt,previous.meta.updatedAt);assert.equal(r.snapshot.meta.lastError,'HTTP_'+status);assert.match(calendarWarning(r.snapshot),/última consulta falló/);assert.equal(JSON.stringify(r.snapshot).includes('credentials'),false);
 }
 assert.equal(JSON.stringify(previous),before);
 const missing=await refreshCalendar({now});assert.equal(missing.snapshot.meta.lastError,'SECRET_MISSING');assert.equal(missing.snapshot.games.length,0);assert.equal(missing.snapshot.meta.updatedAt,null);
});
test('Rechaza paginación cíclica, JSON incompleto y partidos inválidos sin publicar lotes parciales',async()=>{
 for(const replies of [[response([raw()],12),response([raw()],12)],[new Response('invalid json')],[new Response(JSON.stringify({data:[]}))],[response([raw(900002,{visitor_team:{id:2,abbreviation:'BOS'}})])]]){
  const r=await refreshCalendar({apiKey:'synthetic-secret',now,...mockRuntime(replies)});assert.equal(r.ok,false);assert.equal(r.snapshot.games.length,0);
 }
});
test('Ventana incluye hoy y día +14; excluye finalizados en tendencias y avisa si está desactualizado',async()=>{
 const s=await fetchCalendar({apiKey:'synthetic-secret',now,...mockRuntime([response([raw(1,{datetime:'2026-10-20T18:00:00Z'}),raw(2,{date:'2026-11-03',datetime:'2026-11-03T18:00:00Z'}),raw(3,{date:'2026-11-04',datetime:'2026-11-04T18:00:00Z'}),raw(4,{status_state:'final'})])])});
 assert.deepEqual(upcomingGames(s,now).map(g=>g.sourceId),[1,2]);assert.match(calendarWarning(s,'',new Date('2026-10-23T00:00Z')),/36 horas/);
 assert.throws(()=>validateSchedule({...s,games:[s.games[0],s.games[0]]}));assert.throws(()=>validateSchedule({...s,games:[{...s.games[0],day:'2026-10-25'}]}));
});
test('Calendario y tendencias usan el historial sin mutarlo ni sustituirlo; no implican plantilla actual',()=>{
 const d=convertHoopr(fixture()).dataset,original=JSON.stringify(d);const player=d.records.find(r=>r.kind==='player');const records=Array.from({length:210},(_,i)=>({...player,id:'synthetic:'+i,date:new Date(Date.UTC(2026,0,1-i)).toISOString()}));records.push(...d.records.filter(r=>r.kind==='team'));
 const personal={...d,records},before=JSON.stringify(personal),calendar={games:[normalizeGame(raw())]};const schedule=upcomingGames(calendar,now);
 assert.equal(filterRows(personal.records,{entity:player.entityId,limit:200}).length,200);assert.ok(detectTrends({...personal,schedule},200).length>0);assert.equal(JSON.stringify(personal),before);assert.equal(JSON.stringify(d),original);assert.equal(personal.schedule.length,0);
});
test('El secreto solo está enlazado al actualizador de Actions; estadísticas automáticas siguen apagadas',()=>{
 const wf=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');assert.match(wf,/BALLDONTLIE_API_KEY: \$\{\{ secrets.BALLDONTLIE_API_KEY \}\}/);assert.doesNotMatch(wf,/VITE_.*KEY|DATA_SOURCE_ENABLED/);
 assert.equal(JSON.parse(readFileSync(new URL('../data-source.json',import.meta.url))).enabled,false);
});
