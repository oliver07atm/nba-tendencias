import test from 'node:test';import assert from 'node:assert/strict';import {indexedDB} from 'fake-indexeddb';
import {emptyDirectory,validateDirectory,mergeDirectory,directoryAliases,retiredPlayers,visiblePlayerOptions,identityReport,playerState} from '../src/data/player-directory.js';
import {loadDirectory,saveDirectory} from '../src/data/directory-store.js';import {saveHistory,loadHistory} from '../src/data/history-store.js';import {saveRosters,loadRosters} from '../src/data/roster-store.js';
import {rosterTemplate,playerRecords,teamPlayerSections} from '../src/data/rosters.js';import {filterRows,summarize,detectTrends,entityOptions} from '../src/engine.js';import {convertHoopr} from '../src/data/hoopr.js';import {fixture} from './fixtures/hoopr.js';
globalThis.indexedDB=indexedDB;
const at='2026-10-20T10:00:00.000Z',later='2026-10-20T11:00:00.000Z',now=new Date('2026-10-20T12:00:00.000Z');
const proof=()=>({nba:'999991',espn:'999991',name:'Jugador sintético',birthDate:'2000-01-01',checkedAt:at,nbaUrl:'https://www.nba.com/player/999991',espnUrl:'https://africa.espn.com/nba/player/bio/_/id/999991/test'});
const state=(value='retired',checkedAt=at)=>({key:'espn:player:999991',name:'Jugador sintético',state:value,checkedAt,evidenceUrl:'https://www.nba.com/news/synthetic-retirement-test'});
function sample(){const r=rosterTemplate(),t=r.teams.find(t=>t.id==='BOS');t.checkedAt=at;t.players=[{name:'Jugador sintético',ids:{nba:'999991'},membership:{status:'reviewed',checkedAt:at,sourceUrl:'https://www.nba.com/player/999991'}}];return r;}
function data(){const d=convertHoopr(fixture()).dataset,p=d.records.find(r=>r.kind==='player'),team=d.records.find(r=>r.kind==='team');return {...d,records:[...Array.from({length:240},(_,i)=>({...p,id:'synthetic:player:'+i,team:i<80?'LAL':'BOS',date:new Date(Date.UTC(2026,0,1-i)).toISOString()})),...Array.from({length:30},(_,i)=>({...team,id:'synthetic:team:'+i,date:new Date(Date.UTC(2026,0,1-i)).toISOString()}))],schedule:[{home:'BOS',away:'DET'},{home:'LAL',away:'DET'}]};}
test('Una corrección enlaza 200 partidos entre equipos sin modificar registros ni plantillas',()=>{
 const r=sample(),d=data(),patch={...emptyDirectory(),identities:[proof()]},before=JSON.stringify({r,d}),view=playerRecords(d.records,r,patch);
 assert.equal(filterRows(view,{entity:'nba:player:999991',limit:200}).length,200);assert.ok(view.some(p=>p.team==='LAL'));assert.equal(JSON.stringify({r,d}),before);
 const list=teamPlayerSections('BOS',view,r,now,patch);assert.equal(list.confirmed[0].hasStats,true);assert.equal(list.confirmed[0].identityLinked,true);
});
test('Informe distingue identidad pendiente, historial enlazado e identidad verificada sin registros',()=>{
 const r=sample(),d=data();assert.equal(identityReport(d.records,r).pending,1);
 const patch={...emptyDirectory(),identities:[proof()]};assert.equal(identityReport(d.records,r,patch).linked,1);assert.equal(identityReport([],r,patch).noHistory,1);
 const homonym=d.records.map(p=>p.kind==='player'?{...p,entityId:'espn:player:999992'}:p);assert.equal(identityReport(homonym,r,patch).linked,0);
});
test('Rechaza cruces ambiguos, fuentes engañosas y fechas de nacimiento imposibles',()=>{
 for(const edit of [p=>p.espnUrl='https://espn.com.evil.test/nba/player/_/id/999991',p=>p.nbaUrl='https://www.nba.com/player/999992',p=>p.birthDate='2000-02-31',p=>p.checkedAt='invalid']){const p=proof();edit(p);assert.throws(()=>validateDirectory({...emptyDirectory(),identities:[p]}));}
 const p=proof();assert.throws(()=>validateDirectory({...emptyDirectory(),identities:[p,{...p,nba:'999992',nbaUrl:'https://www.nba.com/player/999992'}]}));
 assert.throws(()=>validateDirectory({...emptyDirectory(),records:[]}));
});
test('Las correcciones se combinan sin duplicar y las revisiones antiguas no deshacen las nuevas',()=>{
 const p={...emptyDirectory(),identities:[proof()],statuses:[state()]},base=mergeDirectory(emptyDirectory(),p,sample());assert.deepEqual(mergeDirectory(base,p,sample()),base);const reordered={...p,identities:[Object.fromEntries(Object.entries(p.identities[0]).reverse())]};assert.deepEqual(mergeDirectory(base,reordered,sample()),base);
 const active={...emptyDirectory(),statuses:[state('active',later)]},restored=mergeDirectory(base,active,sample());assert.equal(playerState('nba:player:999991',restored,directoryAliases(sample(),restored),now),'active');assert.deepEqual(mergeDirectory(restored,p,sample()),restored);
 assert.throws(()=>mergeDirectory(base,{...emptyDirectory(),statuses:[state('active')]},sample()),/misma fecha/);
});
test('No infiere retirada por ausencia de equipo; desconocidos y activos permanecen seleccionables',()=>{
 const d=data(),unknown=emptyDirectory(),aliases=directoryAliases(null,unknown);assert.equal(playerState('espn:player:999991',unknown,aliases,now),'unknown');assert.equal(visiblePlayerOptions(d.records,retiredPlayers(unknown,aliases,now)).length,1);
 for(const s of ['unknown','active']){const patch={...emptyDirectory(),statuses:[state(s)]};assert.equal(visiblePlayerOptions(d.records,retiredPlayers(patch,aliases,now)).length,1);}
});
test('Ocultar retirada no cambia resultados, cuartos, porcentajes ni tendencias de equipos',()=>{
 const d=data(),before=JSON.stringify(d),patch={...emptyDirectory(),statuses:[state()]},excluded=retiredPlayers(patch,new Map(),now);
 assert.equal(visiblePlayerOptions(d.records,excluded).length,0);assert.equal(entityOptions(d.records,'team').length,1);
 const a=detectTrends(d,20),b=detectTrends(d,20,{excludedPlayers:excluded});assert.ok(a.some(t=>t.kind==='player'));assert.ok(b.every(t=>t.kind==='team'));assert.deepEqual(a.filter(t=>t.kind==='team'),b);
 for(const stat of ['points','allowed','rebounds','assists','threeMade','margin','combined'])for(const period of ['full','q1','q2','q3','q4','h1','h2']){const rows=d.records.filter(r=>r.kind==='team');const x=summarize(rows,stat,19.5,'over',period);visiblePlayerOptions(d.records,excluded);assert.deepEqual(summarize(rows,stat,19.5,'over',period),x);}
 assert.equal(JSON.stringify(d),before);assert.equal(d.records.filter(p=>p.kind==='player').length,240);
});
test('Estados en IDs NBA o ESPN se resuelven a una identidad y permiten vuelta a competir',()=>{
 const r=sample(),patch={...emptyDirectory(),identities:[proof()],statuses:[state()]},aliases=directoryAliases(r,patch);assert.ok(retiredPlayers(patch,aliases,now).has('nba:player:999991'));
 const update={...emptyDirectory(),statuses:[{...state('active',later),key:'nba:player:999991'}]},restored=mergeDirectory(patch,update,r);assert.equal(retiredPlayers(restored,aliases,now).size,0);
 const future={...emptyDirectory(),statuses:[state('retired','2027-01-01T00:00:00.000Z')]};assert.equal(retiredPlayers(future,new Map(),now).size,0);
});
test('Retiradas requieren fuente y una nueva identidad no puede apropiarse de un ID ESPN ya enlazado',()=>{
 assert.throws(()=>validateDirectory({...emptyDirectory(),statuses:[{...state(),evidenceUrl:'javascript:alert(1)'}]}));
 const r=sample(),p=r.teams.find(t=>t.id==='BOS').players[0];p.ids.espn='999991';p.identity={status:'reviewed',checkedAt:at};
 assert.throws(()=>mergeDirectory(emptyDirectory(),{...emptyDirectory(),identities:[{...proof(),nba:'999992',nbaUrl:'https://www.nba.com/player/999992'}]},r),/dos identidades NBA/);
});
test('Guardar identidades y estados deja intactas las dos bases anteriores; fallo no sustituye correcciones',async()=>{
 const d=convertHoopr(fixture()).dataset,r=sample();await saveHistory(d);await saveRosters(r);const h=JSON.stringify(await loadHistory()),rosters=JSON.stringify(await loadRosters()),p={...emptyDirectory(),identities:[proof()],statuses:[state()]};await saveDirectory(p);assert.deepEqual(await loadDirectory(),p);await assert.rejects(saveDirectory({version:999}));assert.deepEqual(await loadDirectory(),p);assert.equal(JSON.stringify(await loadHistory()),h);assert.equal(JSON.stringify(await loadRosters()),rosters);
});
