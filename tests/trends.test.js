import test from 'node:test';import assert from 'node:assert/strict';
import {detectTrends,trendLines,trendQuality,oddsMetrics,summarize,filterRows} from '../src/engine.js';
import {trendRosterMemberships} from '../src/data/rosters.js';
import {internalTrendsUrl} from '../src/navigation/routes.js';
const rows=(values,extra={})=>values.map((points,i)=>({id:'test:'+i,entity:'Jugador sintético',entityId:'nba:player:999991',kind:'player',points,rebounds:i%10,assists:i%7,threeMade:i%4,minutes:20,team:i<10?'OLD':'NEW',date:new Date(Date.UTC(2026,9,20-i)).toISOString(),venue:i%2?'away':'home',competition:i%3?'Regular':'Playoffs',season:i<15?'2025-26':'2024-25',...extra}));
const schedule=[{id:'future',home:'NEW',away:'OTHER'},{id:'elsewhere',home:'THIRD',away:'FOURTH'}];
const detect=(records,limit=20,options={})=>detectTrends({records,schedule},limit,{currentTeams:new Map([['nba:player:999991','NEW']]),stats:['points'],...options});
test('Mediana cero: no hay líneas negativas ni destacados de estadísticas siempre a cero',()=>{
 assert.deepEqual(detect(rows(Array(20).fill(20),{assists:0,threeMade:0}),20,{stats:['assists','threeMade']}),[]);assert.deepEqual(trendLines(Array(20).fill(0)),[]);assert.deepEqual(detect(rows(Array(20).fill(0))),[]);
 const mixed=detect(rows([0,0,0,0,0,0,1,2,0,0]));assert.ok(mixed.length);assert.ok(mixed.every(t=>t.line>=.5));
 assert.deepEqual(trendLines([...Array(19).fill(0),3]),[]);assert.ok(!trendLines([1,1,1,20,20,30,30,40,40,50]).includes(.5));
 const negative=trendLines([-8,-7,-6,-5,-4],{signed:true});assert.ok(negative.some(l=>l<0));assert.ok(trendLines([-8,-7,-6,-5,-4]).every(l=>l>=.5));
});
test('Candidatos distribuidos y cercanos al rendimiento habitual; no se sustituyen negativos por un 0,5 trivial',()=>{
 const lines=trendLines([14,16,18,20,22,24,26,28,30,32]);assert.ok(lines.length>=3);assert.ok(lines.includes(19.5));assert.ok(!lines.includes(.5));
 const t=detect(rows(Array.from({length:30},(_,i)=>18+i%10)));assert.ok(t.length>1);assert.ok(new Set(t.map(p=>p.line)).size>1);assert.ok(t.every(p=>p.centrality>=.55&&p.line>10));
});
test('Muestras 5/10/15/20 usan denominadores reales y filtros antes de limitar',()=>{
 const records=rows(Array.from({length:18},(_,i)=>10+i));const home=detect(records,5,{venue:'home'});assert.ok(home.length);
 for(const t of home){assert.equal(t.available,9);assert.equal(t.total,5);assert.deepEqual(t.windows.map(w=>w.total),[5,9,9,9]);assert.ok(t.data.every(r=>r.venue==='home'));for(const w of t.windows){const sample=filterRows(records,{venue:'home',limit:w.requested}),s=summarize(sample,t.stat,t.line,t.direction);assert.equal(w.hits,s.hits);assert.equal(w.percent,s.percent);}}
 const away=detect(records,'all',{venue:'away',seasons:['2025-26'],competition:'Regular'});assert.ok(away.length);assert.ok(away.every(t=>t.data.every(r=>r.venue==='away'&&r.season==='2025-26'&&r.competition==='Regular')));
});
test('Carrera, 100/150/200 y personalizada conservan equipos anteriores y filtros de equipo actual/partido/jugador',()=>{
 const records=rows(Array.from({length:340},(_,i)=>15+i%15));
 for(const n of [100,150,200,237,'all']){const t=detect(records,n,{matchId:'future',team:'NEW',player:'nba:player:999991'});assert.ok(t.length);assert.equal(t[0].total,n==='all'?340:n);assert.equal(t[0].available,340);assert.equal(t[0].team,'NEW');}
 assert.equal(detect(records,20,{team:'OLD'}).length,0);assert.equal(detect(records,20,{matchId:'elsewhere'}).length,0);assert.equal(detect(records,20,{player:'unknown'}).length,0);
 const t=detect(records,20);assert.ok(t.some(t=>t.data.some(r=>r.team==='OLD')));
});
test('PRA y todas las combinaciones usan registros originales; las series cortas se penalizan en calidad',()=>{
 const records=rows(Array.from({length:40},(_,i)=>15+i%12));
 for(const stat of ['pra','pr','pa','ra','threeMade','assists','rebounds']){const t=detect(records,20,{stats:[stat]});assert.ok(t.length);assert.equal(t[0].average,summarize(filterRows(records,{limit:20}),stat,t[0].line).average);}
 assert.ok(trendQuality(80,100,20.5,20,5).quality>trendQuality(5,5,20.5,20,5).quality);assert.ok(trendQuality(20,20,.5,20,5).quality<trendQuality(20,20,19.5,20,5).quality);
 const t=detect(records,20,{minPercent:75});assert.ok(t.every(t=>t.percent>=75));
});
test('Margen conserva valores y líneas negativas sin alterar puntos ni cuartos',()=>{
 const records=rows(Array.from({length:30},(_,i)=>90+i%7),{kind:'team',entity:'NEW',entityId:'NEW',team:'NEW'}).map((r,i)=>({...r,quarters:[20,20,20,r.points-60],opponentQuarters:[25,25,25,25],opponentStats:{}}));const before=JSON.stringify(records),t=detect(records,20,{stats:['margin']});assert.ok(t.some(t=>t.line<0));assert.equal(JSON.stringify(records),before);
});
test('Excluir retirados y filtrar tendencias no cambia ninguna estadística ni resultado de equipos',()=>{
 const player=rows(Array.from({length:50},(_,i)=>10+i%20));const teams=rows(Array.from({length:50},(_,i)=>100+i%12),{kind:'team',entity:'NEW',entityId:'NEW',team:'NEW'}).map(r=>({...r,quarters:[25,25,25,r.points-75],opponentQuarters:[24,24,24,24],opponentStats:{}}));
 const dataset={records:[...player,...teams],schedule},before=JSON.stringify(dataset),a=detectTrends(dataset,20,{currentTeams:new Map([['nba:player:999991','NEW']])}),b=detectTrends(dataset,20,{currentTeams:new Map([['nba:player:999991','NEW']]),excludedPlayers:new Set(['nba:player:999991'])});assert.ok(a.some(t=>t.kind==='player'));assert.ok(b.every(t=>t.kind==='team'));assert.deepEqual(a.filter(t=>t.kind==='team'),b);
 const original=summarize(teams,'points',29.5,'over','q1');detectTrends(dataset,5,{venue:'home',stats:['pra']});assert.deepEqual(summarize(teams,'points',29.5,'over','q1'),original);assert.equal(JSON.stringify(dataset),before);
});
test('Cuotas y estimación son independientes de la frecuencia histórica; no se inventan valores',()=>{
 const empty=oddsMetrics();assert.equal(empty.odds,null);assert.equal(empty.fairOdds,null);assert.equal(empty.expectedValue,null);
 const quote=oddsMetrics({odds:'2'});assert.equal(quote.impliedProbability,50);assert.equal(quote.expectedValue,null);
 const x=oddsMetrics({odds:'2',estimatedProbability:'60'});assert.ok(Math.abs(x.expectedValue-.2)<1e-12);assert.ok(Math.abs(x.fairOdds-1/.6)<1e-12);
 assert.equal(oddsMetrics({odds:2,estimatedProbability:0}).fairOdds,Infinity);assert.equal(oddsMetrics({odds:2,estimatedProbability:0}).expectedValue,-1);
 for(const input of [{odds:1.19},{odds:1.3,minOdds:1.5},{minOdds:1},{estimatedProbability:101},{estimatedProbability:-1},{odds:'abc'}])assert.throws(()=>oddsMetrics(input));
});
test('Plantillas antiguas se avisan sin ocultarlas; pendientes y fechas futuras no asignan equipos',()=>{
 const now=new Date('2026-10-21T00:00:00Z'),p=(id,status,at)=>({name:'Sintético',ids:{nba:id},membership:{status,season:'2026-27',checkedAt:at}}),rosters={season:'2026-27',teams:[{id:'NEW',players:[p('1','reviewed','2026-10-01T00:00:00Z'),p('2','pending','2026-10-20T00:00:00Z'),p('3','reviewed','2027-01-01T00:00:00Z')]}]};
 const map=trendRosterMemberships(rosters,now);assert.equal(map.size,1);assert.equal(map.get('nba:player:1').state,'outdated');
 const manual=p('4','reviewed','2026-10-20T00:00:00Z');delete manual.membership.season;rosters.teams[0].players.push(manual);assert.ok(trendRosterMemberships(rosters,now).has('nba:player:4'));
 assert.equal(internalTrendsUrl('/tendencias?tVenue=home'),'/tendencias?tVenue=home');for(const u of ['https://evil.test','//evil.test','/tendencias/evil','/tendencias#evil'])assert.equal(internalTrendsUrl(u),null);
});
