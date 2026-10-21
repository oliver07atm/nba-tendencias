import test from 'node:test';import assert from 'node:assert/strict';
import {fetchCalendar,refreshCalendar,needsSeasonScan,calendarSeason,CALENDAR_BUDGET} from '../scripts/lib/balldontlie.mjs';
import {normalizeGame,upcomingGames,canaryDay,addDays,calendarWarning,validateSchedule} from '../src/data/schedule.js';
import {calendarFilters,calendarSearch,filterCalendarGames,calendarPage,monthDays,shiftMonth} from '../src/data/calendar-view.js';
// Entirely synthetic games; no real historical files or API credentials in tests.
const now=new Date('2026-10-21T10:00:00Z'),raw=(id=999991,extra={})=>({id,season:2026,date:'2026-10-20',datetime:'2026-10-20T23:30:00Z',status:'7:30 pm ET',home_team:{id:2,abbreviation:'BOS'},visitor_team:{id:9,abbreviation:'DET'},home_team_score:0,visitor_team_score:0,...extra});
const response=(data,next=null)=>new Response(JSON.stringify({data,meta:{next_cursor:next}}));
const old=(games=[],completedAt='2026-10-20T10:00:00Z')=>({meta:{source:'BALLDONTLIE',updatedAt:completedAt,seasonScan:{year:2026,completedAt}},games:games.map(g=>({...normalizeGame(g),observedAt:completedAt}))});
function runtime(replies){let time=0;const calls=[];return {calls,clock:()=>time,wait:async ms=>{time+=ms;},fetchImpl:async(url,options)=>{calls.push({url:new URL(url),options,time});const next=replies.shift();if(next instanceof Error)throw next;return next;}};}
test('Carga inicial de temporada: pagina más de 1.200 partidos, sin límite de 30 días ni inventar playoffs',async()=>{
 const games=Array.from({length:1245},(_,i)=>raw(900000+i,{date:addDays('2026-10-20',i%175),datetime:addDays('2026-10-20',i%175)+'T23:30:00Z'})),pages=[];for(let i=0;i<games.length;i+=100)pages.push(response(games.slice(i,i+100),i+100<games.length?i+100:null));
 const rt=runtime(pages),result=await refreshCalendar({apiKey:'synthetic',now,...rt});assert.equal(result.ok,true);assert.equal(result.snapshot.games.length,1245);assert.equal(result.snapshot.meta.seasonScan.year,2026);assert.equal(result.snapshot.meta.seasonScan.returnedGames,1245);assert.equal(rt.calls.length,13);assert.ok(rt.calls.at(-1).time<CALENDAR_BUDGET.durationMs);
 for(const [i,c] of rt.calls.entries()){assert.equal(c.url.pathname,'/v1/games');assert.equal(c.url.searchParams.get('seasons[]'),'2026');assert.equal(c.url.searchParams.has('start_date'),false);assert.equal(c.url.searchParams.has('season_type'),false);if(i)assert.ok(c.time-rt.calls[i-1].time>=13000);}
 assert.equal(result.snapshot.games.filter(g=>g.competition==='Playoffs').length,0);
});
test('Revisión diaria incremental conserva lejanos/resultados y actualiza un aplazado por ID aunque cambie de fecha',async()=>{
 const previous=old([raw(1,{date:'2026-10-01',datetime:'2026-10-01T20:00Z',status:'Postponed'}),raw(2,{date:'2027-03-01',datetime:'2027-03-01T23:30Z'}),raw(3,{date:'2026-09-01',datetime:'2026-09-01T20:00Z',status:'Final',home_team_score:100,visitor_team_score:99})]),before=JSON.stringify(previous);
 const rt=runtime([response([raw(4)]),new Response(JSON.stringify({data:raw(1,{date:'2027-01-02',datetime:'2027-01-02T23:30Z'})}))]),r=await refreshCalendar({apiKey:'synthetic',previous,now,...rt});assert.equal(r.ok,true);assert.equal(r.snapshot.meta.strategy,'incremental');assert.equal(r.snapshot.games.length,4);assert.equal(r.snapshot.games.find(g=>g.sourceId===1).day,'2027-01-02');assert.equal(r.snapshot.games.find(g=>g.sourceId===1).status,'scheduled');assert.equal(r.snapshot.games.find(g=>g.sourceId===2).observedAt,previous.meta.updatedAt);assert.equal(r.snapshot.meta.seasonScan.completedAt,previous.meta.seasonScan.completedAt);assert.equal(rt.calls[0].url.searchParams.has('seasons[]'),false);assert.equal(rt.calls[1].url.pathname,'/v1/games/1');assert.equal(rt.calls[1].time,13000);assert.equal(JSON.stringify(previous),before);
});
test('Revisión semanal descubre NBA Cup/playoffs publicados y reemplaza por ID sin borrar partidos ausentes',async()=>{
 const previous=old([raw(1,{status:'Final',home_team_score:100,visitor_team_score:99}),raw(2)],'2026-10-01T10:00:00Z'),r=await refreshCalendar({apiKey:'synthetic',previous,now,...runtime([response([raw(1,{status:'Final',home_team_score:101,visitor_team_score:99}),raw(3,{ist_stage:'Championship'}),raw(4,{postseason:true,date:'2027-05-01',datetime:'2027-05-01T20:00Z'})])])});assert.equal(r.ok,true);assert.equal(r.snapshot.games.length,4);assert.equal(r.snapshot.games.find(g=>g.sourceId===1).homeScore,101);assert.equal(r.snapshot.games.find(g=>g.sourceId===3).competition,'NBA Cup');assert.equal(r.snapshot.games.find(g=>g.sourceId===4).competition,'Playoffs');assert.equal(new Set(r.snapshot.games.map(g=>g.id)).size,4);
});
test('El presupuesto corta paginación excesiva conservando la última copia; nunca llama a estadísticas',async()=>{
 const previous=old([raw()],'2026-10-01T10:00Z'),rt=runtime(Array.from({length:23},(_,i)=>response([raw(900000+i)],i+1))),r=await refreshCalendar({apiKey:'synthetic',previous,now,...rt});assert.equal(r.ok,false);assert.deepEqual(r.snapshot.games,previous.games);assert.ok(['PAGE_LIMIT','REQUEST_BUDGET'].includes(r.snapshot.meta.lastError));assert.ok(rt.calls.length<=22);assert.ok(rt.calls.every(c=>c.url.pathname==='/v1/games'));
});
test('La pausa inicial y los reintentos comparten presupuesto y límite de cinco peticiones por minuto',async()=>{
 const rt=runtime([new Response('do not expose',{status:429,headers:{'retry-after':'60'}}),response([raw()])]),r=await refreshCalendar({apiKey:'synthetic',now,initialDelayMs:13000,...rt});assert.equal(r.ok,true);assert.deepEqual(rt.calls.map(c=>c.time),[13000,73000]);assert.equal(r.snapshot.meta.requests,2);
 let ms=0;const previous=old([raw()],'2026-10-01T10:00Z'),late=await refreshCalendar({apiKey:'synthetic',previous,now,clock:()=>ms,wait:async n=>{ms+=n+330000;},fetchImpl:async()=>response([raw()],123)});assert.equal(late.ok,false);assert.equal(late.snapshot.meta.lastError,'REQUEST_BUDGET');assert.deepEqual(late.snapshot.games,previous.games);
});
test('404 en un antiguo no lo borra ni bloquea otros aplazados; errores parciales se avisan',async()=>{
 const previous=old([raw(1,{date:'2026-10-01',datetime:'2026-10-01T20:00Z',status:'Postponed'}),raw(2,{date:'2026-10-02',datetime:'2026-10-02T20:00Z',status:'Postponed'})]),rt=runtime([response([]),new Response('private raw error',{status:404}),new Response(JSON.stringify({data:raw(2,{status:'Final',home_team_score:110,visitor_team_score:100})}))]),r=await refreshCalendar({apiKey:'synthetic',previous,now,...rt});assert.equal(r.ok,true);assert.equal(r.snapshot.games.length,2);assert.equal(r.snapshot.games.find(g=>g.sourceId===1).observedAt,previous.meta.updatedAt);assert.equal(r.snapshot.games.find(g=>g.sourceId===1).lastCheckAttemptAt,'2026-10-21T10:00:13.000Z');assert.equal(r.snapshot.games.find(g=>g.sourceId===2).status,'final');assert.match(calendarWarning(r.snapshot,'',now),/antiguos/);assert.ok(!JSON.stringify(r.snapshot).includes('private raw error'));
});
test('Entradas sin ambos equipos no se inventan; una temporada errónea se rechaza',async()=>{
 const r=await refreshCalendar({apiKey:'synthetic',now,...runtime([response([raw(),raw(999992,{home_team:null})])])});assert.equal(r.ok,true);assert.equal(r.snapshot.games.length,1);assert.equal(r.snapshot.meta.unassigned,1);
 const wrong=await refreshCalendar({apiKey:'synthetic',now,...runtime([response([raw(999993,{season:2025})])])});assert.equal(wrong.ok,false);assert.equal(wrong.snapshot.meta.lastError,'INVALID_SEASON');
 assert.throws(()=>validateSchedule({...r.snapshot,meta:{...r.snapshot.meta,seasonScan:{year:2026,completedAt:'invalid'}}}),/Revisión de temporada inválida/);
});
test('Meses, años, febrero bisiesto y fechas usan Canarias, incluido el cambio de hora',()=>{
 assert.equal(shiftMonth('2026-12',1),'2027-01');assert.equal(shiftMonth('2027-01',-1),'2026-12');assert.equal(monthDays('2028-02').filter(Boolean).length,29);assert.equal(monthDays('2027-02').filter(Boolean).length,28);assert.equal(monthDays('2026-10').length%7,0);assert.equal(monthDays('2026-10')[3],'2026-10-01');
 assert.equal(canaryDay('2026-10-24T23:30Z'),'2026-10-25');assert.equal(canaryDay('2026-10-25T23:30Z'),'2026-10-25');assert.equal(calendarSeason(now),2026);assert.equal(needsSeasonScan(old(),now),false);assert.equal(needsSeasonScan(old([],'2026-10-14T10:00:00Z'),now),true);
});
test('Filtros combinados y paginación no duplican, conservan URL y restablecen página al cambiar fecha',()=>{
 const games=Array.from({length:80},(_,i)=>normalizeGame(raw(900000+i,{date:addDays('2026-10-01',i%40),datetime:addDays('2026-10-01',i%40)+'T20:00Z',status:i%2?'Final':'Scheduled'}))),original=JSON.stringify(games);
 const f=calendarFilters('?calendarRange=month&calendarMonth=2026-10&calendarTeam=BOS&calendarStatus=final',now),filtered=filterCalendarGames(games,f,now);assert.ok(filtered.length);assert.ok(filtered.every(g=>g.day.startsWith('2026-10')&&g.status==='final'));assert.equal(JSON.stringify(games),original);
 const all=filterCalendarGames(games,{...f,range:'all',status:''},now),a=calendarPage(all,1),b=calendarPage(all,2);assert.equal(a.games.length,30);assert.equal(b.games.length,30);assert.equal(new Set([...a.games,...b.games].map(g=>g.id)).size,60);assert.equal(calendarPage([],999).page,1);
 const query=calendarSearch('?calendarTeam=BOS&calendarPage=3&calendarStatus=final',{calendarDay:'2027-01-04',calendarMonth:'2027-01',calendarRange:'day'}),p=new URLSearchParams(query);assert.equal(p.has('calendarPage'),false);assert.equal(p.get('calendarTeam'),'BOS');assert.equal(p.get('calendarStatus'),'final');
 assert.equal(calendarFilters('?calendarMonth=2026-99&calendarDay=2026-02-31&calendarTeam=bad&calendarPage=-5',now).month,'2026-10');
});
test('Cualquier encuentro futuro publicado puede analizarse sin el límite de 14 días, también aplazados con aviso',()=>{
 const s=old([raw(1,{date:'2027-04-01',datetime:'2027-04-01T20:00Z'}),raw(2,{date:'2027-04-01',datetime:'2027-04-01T20:00Z',status:'Postponed'}),raw(3,{date:'2027-04-01',datetime:'2027-04-01T20:00Z',status:'Final'})]);assert.equal(upcomingGames(s,now).length,0);assert.deepEqual(upcomingGames(s,now,{allDates:true}).map(g=>g.sourceId),[1,2]);
});
