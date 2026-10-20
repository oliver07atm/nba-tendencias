import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {indexedDB} from 'fake-indexeddb';
import {rosterTemplate,validateRosters,verifiedRoster,identityAliases,playerRecords,verifiedTeamMap,teamPlayerSections,rosterCoverage} from '../src/data/rosters.js';
import {loadRosters,saveRosters} from '../src/data/roster-store.js';
import {loadHistory,saveHistory,deleteHistory} from '../src/data/history-store.js';
import {fixture} from './fixtures/hoopr.js';
import {convertHoopr} from '../src/data/hoopr.js';
import {entityOptions,filterRows,detectTrends} from '../src/engine.js';
import {readRoute,internalMatchUrl,analysisFilters,filterSearch} from '../src/navigation/routes.js';
globalThis.indexedDB=indexedDB;
const at='2026-10-20T10:00:00.000Z',now=new Date('2026-10-20T11:00:00.000Z');
function sample(){const r=rosterTemplate(),t=r.teams.find(t=>t.id==='BOS');t.checkedAt=at;t.players=[{name:'Jugador sintético',ids:{nba:'999991',espn:'999991'},membership:{status:'reviewed',checkedAt:at,sourceUrl:'https://www.nba.com/player/999991'},identity:{status:'reviewed',checkedAt:at,birthDate:'2000-01-01',nbaUrl:'https://www.nba.com/player/999991',espnUrl:'https://www.espn.com/nba/player/_/id/999991'}}];return r;}
test('Rutas por hash admiten secciones, partidos y entidades con IDs estables',()=>{
 for(const [path,page]of[['/partidos','Partidos'],['/partidos/bdl%3Agame%3A1','Partidos'],['/jugadores','Jugadores'],['/jugadores/nba%3Aplayer%3A999991','Jugadores'],['/equipos','Equipos'],['/equipos/BOS','Equipos'],['/tendencias','Tendencias'],['/datos','Datos']])assert.equal(readRoute(path).page,page);
 assert.equal(readRoute('/jugadores/espn%3Aplayer%3A1').id,'espn:player:1');assert.equal(readRoute('/desconocida').page,null);assert.equal(readRoute('/datos/extra').page,null);assert.equal(readRoute('/jugadores/%E0%A4%A').page,null);
});
test('Filtros compartibles conservan muestras, líneas, temporadas, dirección y contexto',()=>{
 let q='?from=%2Fpartidos%2Fbdl%253Agame%253A1';for(const [k,v]of Object.entries({stat:'threeMade',line:'3.5',limit:'200',custom:177,venue:'away',opponent:'DET',competition:'Playoffs',seasons:['2023-24','2025-26'],direction:'under',period:'q1',against:true}))q=filterSearch(q,k,v);
 const f=analysisFilters(q);assert.equal(f.stat,'threeMade');assert.equal(f.line,'3.5');assert.equal(f.limit,'200');assert.equal(f.custom,177);assert.equal(f.direction,'under');assert.equal(f.venue,'away');assert.deepEqual(f.seasons,['2023-24','2025-26']);assert.equal(f.against,true);assert.equal(f.opponent,'DET');assert.equal(f.competition,'Playoffs');assert.equal(f.period,'q1');assert.ok(internalMatchUrl(new URLSearchParams(q).get('from')));
 assert.equal(analysisFilters('?line=abc&limit=-1').line,'24.5');assert.equal(analysisFilters('?stat=bad').stat,'points');assert.equal(analysisFilters('','team').line,'109.5');
 for(const unsafe of ['https://evil.test','//evil.test','javascript:alert(1)','/datos','/partidos','/partidos/1#bad'])assert.equal(internalMatchUrl(unsafe),null);
});
test('Base independiente de 30 equipos: pertenencias pendientes o caducadas nunca son actuales',()=>{
 const r=sample();validateRosters(r);assert.equal(r.teams.length,30);assert.equal(verifiedRoster('BOS',r,now).length,1);assert.equal(verifiedRoster('DET',r,now).length,0);assert.equal(verifiedRoster('BOS',r,new Date('2026-10-28')).length,0);assert.equal(verifiedRoster('BOS',r,new Date('2026-10-19')).length,0);
 r.teams.find(t=>t.id==='BOS').players[0].membership.status='pending';assert.equal(verifiedRoster('BOS',r,now).length,0);
});
test('Rechaza duplicados NBA/ESPN, fuentes falsas y cruces sin biografía verificable',()=>{
 for(const modify of [r=>r.teams.push(r.teams[0]),r=>r.teams[0].sourceUrl='https://nba.com.evil.test/team/1610612737',r=>r.teams.find(t=>t.id==='BOS').players.push({...r.teams.find(t=>t.id==='BOS').players[0]}),r=>r.teams.find(t=>t.id==='BOS').players[0].identity.espnUrl='https://www.espn.com/nba/player/_/id/other',r=>r.teams.find(t=>t.id==='BOS').players[0].identity.birthDate='']){const r=sample();modify(r);assert.throws(()=>validateRosters(r));}
 const r=sample();r.teams.find(t=>t.id==='BOS').players.push({...r.teams.find(t=>t.id==='BOS').players[0],ids:{nba:'999992',espn:'999991'}});assert.throws(()=>validateRosters(r),/identificador externo/);
});
test('No une homónimos por nombre; conserva 200 actuaciones entre equipos tras un traspaso',()=>{
 const r=sample(),d=convertHoopr(fixture()).dataset,p=d.records.find(r=>r.kind==='player');const records=Array.from({length:240},(_,i)=>({...p,id:'inventado:'+i,team:i<80?'LAL':'BOS',date:new Date(Date.UTC(2026,0,1-i)).toISOString()}));records.push({...p,id:'homonimo',entityId:'espn:player:999992'});const before=JSON.stringify(records),view=playerRecords(records,r);
 assert.equal(identityAliases(r).get('espn:player:999991'),'nba:player:999991');assert.equal(entityOptions(view,'player').length,2);const rows=filterRows(view,{entity:'nba:player:999991',limit:200});assert.equal(rows.length,200);assert.ok(rows.some(r=>r.team==='LAL'));assert.ok(rows.some(r=>r.team==='BOS'));assert.equal(JSON.stringify(records),before);
 const trends=detectTrends({...d,records:view,schedule:[{home:'BOS',away:'DET'}]},200,{currentTeams:verifiedTeamMap(r,now)});assert.ok(trends.length);assert.ok(trends.every(t=>t.team==='BOS'&&t.entityId==='nba:player:999991'));assert.equal(trends[0].total,200);
});
test('ID ESPN no contrastado no se enlaza automáticamente a un ID NBA',()=>{const r=sample();delete r.teams.find(t=>t.id==='BOS').players[0].identity;assert.equal(identityAliases(r).has('espn:player:999991'),false);});
test('Guardar o rechazar plantillas no modifica ni una fila del historial personal',async()=>{
 const d=convertHoopr(fixture()).dataset;await saveHistory(d);const before=JSON.stringify(await loadHistory());await saveRosters(sample());assert.equal((await loadRosters()).teams.length,30);assert.equal(JSON.stringify(await loadHistory()),before);await assert.rejects(saveRosters({version:999}));assert.equal((await loadRosters()).teams.length,30);assert.equal(JSON.stringify(await loadHistory()),before);await deleteHistory();
});
test('La base pública contiene identidad y pertenencias documentadas, sin estadísticas personales',()=>{
 const r=JSON.parse(readFileSync(new URL('../public/data/rosters.json',import.meta.url)));validateRosters(r);assert.equal(Object.hasOwn(r,'records'),false);for(const p of r.teams.flatMap(t=>t.players))for(const key of ['records','points','rebounds','assists','threeMade'])assert.equal(Object.hasOwn(p,key),false);
 const wf=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');assert.ok(wf.includes('secrets.BALLDONTLIE_API_KEY'));assert.equal(/players\/active/.test(wf),false);
});
test('Detalle muestra históricos inmediatamente sin exigir pertenencia actual ni unir homónimos',()=>{
 const r=sample(),p=convertHoopr(fixture()).dataset.records.find(r=>r.kind==='player');
 const rows=[p,{...p,id:'other',entity:'Otro histórico',entityId:'espn:player:777777'},{...p,id:'same-name',entityId:'espn:player:888888'}];
 const before=JSON.stringify(rows),out=teamPlayerSections('BOS',rows,r,now);
 assert.equal(out.confirmed.length,1);assert.deepEqual(new Set(out.others.map(p=>p.key)),new Set(['espn:player:777777','espn:player:888888']));assert.ok(out.others.every(p=>p.hasStats&&p.state==='pending'));assert.equal(JSON.stringify(rows),before);
});
test('Una revisión antigua permanece accesible con advertencia incluso sin historial',()=>{
 const r=sample(),later=new Date('2026-10-28T11:00Z');let out=teamPlayerSections('BOS',[],r,later);
 assert.equal(out.confirmed.length,0);assert.equal(out.others.length,1);assert.equal(out.others[0].state,'outdated');assert.equal(out.others[0].hasStats,false);assert.equal(out.others[0].checkedAt,at);
 const p=convertHoopr(fixture()).dataset.records.find(r=>r.kind==='player');out=teamPlayerSections('BOS',[p],r,later);assert.equal(out.others.length,1);assert.equal(out.others[0].hasStats,true);
});
test('Traspaso confirmado mantiene acceso desde ambos equipos y las 200 actuaciones anteriores',()=>{
 const r=sample(),bos=r.teams.find(t=>t.id==='BOS'),lal=r.teams.find(t=>t.id==='LAL');lal.players=bos.players;lal.checkedAt=at;bos.players=[];validateRosters(r);
 const p=convertHoopr(fixture()).dataset.records.find(r=>r.kind==='player'),records=Array.from({length:240},(_,i)=>({...p,id:'trade:'+i,team:i<80?'LAL':'BOS',date:new Date(Date.UTC(2026,0,1-i)).toISOString()}));
 const old=teamPlayerSections('BOS',records,r,now),current=teamPlayerSections('LAL',records,r,now);
 assert.equal(old.confirmed.length,0);assert.equal(old.others[0].confirmedTeam,'LAL');assert.equal(current.confirmed.length,1);assert.equal(current.others.length,0);assert.equal(filterRows(playerRecords(records,r),{entity:current.confirmed[0].key,limit:200}).length,200);
});
test('Pendientes de la base e históricos no duplican jugadores por ID y la cobertura no inventa totales',()=>{
 const r=sample(),p=convertHoopr(fixture()).dataset.records.find(r=>r.kind==='player');r.teams.find(t=>t.id==='BOS').players[0].membership.status='pending';
 const out=teamPlayerSections('BOS',[p,p],r,now);assert.equal(out.others.length,1);assert.equal(out.others[0].hasStats,true);assert.equal(out.others[0].state,'pending');
 const coverage=rosterCoverage(r,now);assert.equal(coverage.length,30);assert.equal(coverage.find(t=>t.id==='BOS').confirmed,0);assert.equal(coverage.find(t=>t.id==='BOS').awaitingReview,1);assert.ok(coverage.every(t=>!t.complete));
});
test('Las entradas pendientes se pueden mostrar sin ejecutar enlaces ni fechas no validados',()=>{
 const r=sample(),p=r.teams.find(t=>t.id==='BOS').players[0];p.membership={status:'pending',sourceUrl:'javascript:alert(1)',checkedAt:'fecha desconocida'};
 const out=teamPlayerSections('BOS',[],r,now);assert.equal(out.others.length,1);assert.equal(out.others[0].source,null);assert.equal(out.others[0].checkedAt,null);
});
