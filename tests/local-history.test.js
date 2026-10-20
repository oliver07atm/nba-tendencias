import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Papa from 'papaparse';
import {indexedDB} from 'fake-indexeddb';
import {fixture} from './fixtures/hoopr.js';
import {asUnverifiedHistory,importSeasonTexts,importLocalFile} from '../src/data/local-history.js';
import {loadHistory,saveHistory,setHistoryActive,deleteHistory,storageError} from '../src/data/history-store.js';
import {filterRows,summarize} from '../src/engine.js';
globalThis.indexedDB=indexedDB;
const texts=f=>Object.fromEntries(Object.entries(f).map(([key,rows])=>[key,Papa.unparse(rows)]));
test('Convierte los tres CSV y preserva gráficos de P/R/A, triples, combinadas y cuartos',()=>{
 const {dataset,report}=importSeasonTexts(texts(fixture()));assert.equal(dataset.records.length,3);assert.equal(report.addedRecords,3);assert.equal(report.duplicates,0);
 const player=dataset.records.filter(r=>r.kind==='player');for(const [stat,n]of[['points',20],['rebounds',6],['assists',5],['threeMade',2],['pra',31]])assert.equal(summarize(player,stat,n-.5).hits,1);
 const team=dataset.records.filter(r=>r.kind==='team'&&r.team==='BOS');assert.equal(summarize(team,'points',24.5,'over','q1').hits,1);assert.equal(summarize(team,'allowed',24.5,'under','q1').hits,1);
});
test('Detecta temporadas incompatibles, archivos intercambiados, vacíos y sin registros útiles',()=>{
 const wrong=fixture();wrong.teams[0].season='2026';assert.throws(()=>importSeasonTexts(texts(wrong)),/única temporada/);
 const other=fixture();other.teams.forEach(r=>r.season='2026');assert.throws(()=>importSeasonTexts(texts(other)),/misma temporada/);
 const t=texts(fixture());assert.throws(()=>importSeasonTexts({...t,players:t.teams}),/athlete_id/);assert.throws(()=>importSeasonTexts({...t,players:''}),/vacío/);
 const pending=fixture();pending.schedule[0].status_type_completed='false';assert.throws(()=>importSeasonTexts(texts(pending)),/actuaciones completas/);
});
test('Combina temporadas y la repetición del mismo lote o JSON no duplica actuaciones',()=>{
 const a=importSeasonTexts(texts(fixture())).dataset;
 const b=importSeasonTexts(texts(fixture(2026,'100000002')),a);assert.equal(b.dataset.records.length,6);assert.equal(b.report.addedRecords,3);
 const repeated=importSeasonTexts(texts(fixture()),b.dataset);assert.equal(repeated.dataset.records.length,6);assert.equal(repeated.report.duplicates,3);assert.equal(repeated.report.addedRecords,0);
 const restored=importLocalFile(JSON.stringify(repeated.dataset),'iphone.json',repeated.dataset);assert.equal(restored.records.length,6);assert.equal(restored.meta.mode,'imported');assert.equal(restored.meta.origin,'historical-unverified');
 assert.equal(filterRows(restored.records,{entity:'espn:player:999991',limit:200}).length,2);
});
test('Un conflicto conserva intacto el historial previo',()=>{
 const a=importSeasonTexts(texts(fixture())).dataset;const original=JSON.stringify(a);const f=fixture();f.players[0].points='22';assert.throws(()=>importSeasonTexts(texts(f),a),/conflictivo/);assert.equal(JSON.stringify(a),original);
});
test('Nunca eleva un JSON importado a estadística oficial verificada y no mezcla demostración',()=>{
 const data=importSeasonTexts(texts(fixture())).dataset;data.meta.mode='real';data.meta.rights.status='verified';data.meta.accuracy.status='verified';const d=importLocalFile(JSON.stringify(data),'iphone.json');assert.equal(d.meta.mode,'imported');assert.equal(d.meta.rights.status,'unresolved');assert.equal(d.meta.accuracy.status,'unverified');
 const demo=JSON.parse(readFileSync(new URL('../public/data/demo.json',import.meta.url)));assert.equal(asUnverifiedHistory(demo).meta.mode,'demo');assert.throws(()=>importSeasonTexts(texts(fixture()),demo),/demostración/);
});
test('IndexedDB guarda, restaura, alterna demostración sin borrar, reemplaza y elimina',async()=>{
 await deleteHistory();assert.equal(await loadHistory(),null);const a=importSeasonTexts(texts(fixture()));await saveHistory(a.dataset,{report:a.report});
 const saved=await loadHistory();assert.equal(saved.dataset.records.length,3);assert.equal(saved.active,true);assert.ok(saved.savedAt);assert.equal(saved.report.addedRecords,3);
 await setHistoryActive(false);let d=await loadHistory();assert.equal(d.active,false);assert.equal(d.dataset.records.length,3);
 await setHistoryActive(true);assert.equal((await loadHistory()).active,true);
 const b=importSeasonTexts(texts(fixture(2026,'100000002')),saved.dataset);await saveHistory(b.dataset);assert.equal((await loadHistory()).dataset.records.length,6);
 await deleteHistory();assert.equal(await loadHistory(),null);
});
test('IndexedDB bloqueado y errores de espacio no se presentan como guardado correcto',async()=>{
 const real=globalThis.indexedDB;try{globalThis.indexedDB=undefined;await assert.rejects(loadHistory(),/no disponible/);await assert.rejects(saveHistory(importSeasonTexts(texts(fixture())).dataset));}finally{globalThis.indexedDB=real;}
 assert.match(storageError({name:'QuotaExceededError'}),/exporta el JSON/);assert.match(storageError(Error('blocked')),/navegación privada/);
});
test('Importa formato histórico y combina tres temporadas sin modificar la base',()=>{
 const base=importSeasonTexts(texts(fixture(2026,'100000003')),importSeasonTexts(texts(fixture(2025,'100000002'))).dataset).dataset;
 const before=JSON.stringify(base),f=fixture(2024,'100000001');
 f.schedule[0].home_linescores="[{'value': 25.0} {'value': 25.0} {'value': 25.0} {'value': 25.0}]";f.schedule[0].away_linescores="[{'value': 24.0} {'value': 24.0} {'value': 24.0} {'value': 24.0}]";
 const a=importSeasonTexts(texts(f),base);assert.equal(a.dataset.records.length,9);assert.equal(a.report.addedRecords,3);assert.equal(JSON.stringify(base),before);
 const repeat=importSeasonTexts(texts(f),a.dataset);assert.equal(repeat.dataset.records.length,9);assert.equal(repeat.report.addedRecords,0);assert.equal(repeat.report.duplicates,3);
});
test('Importación rechazada detalla cantidades, motivos y ejemplos sin alterar IndexedDB',async()=>{
 const saved=importSeasonTexts(texts(fixture()));await saveHistory(saved.dataset,{report:saved.report});const before=JSON.stringify(await loadHistory());
 const f=fixture(2024);f.schedule[0].home_linescores='[]';
 assert.throws(()=>importSeasonTexts(texts(f),saved.dataset),error=>{assert.match(error.message,/1 rechazados/);assert.match(error.message,/Partidos: 1 — Faltan cuartos/);assert.match(error.message,/100000001: Faltan cuartos/);assert.match(error.message,/no se ha modificado/);return true;});
 assert.equal(JSON.stringify(await loadHistory()),before);await deleteHistory();
});
