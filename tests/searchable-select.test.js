import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeSearch,filterSelectOptions} from '../src/components/searchable-select.js';
test('Partial names ignore case and accents without changing IDs or input options',()=>{
 const options=[{value:'nba:1',label:'Egor Dëmin'},{value:'espn:2',label:'José Alvarado'},{value:'nba:3',label:'Jayson Tatum'}],before=JSON.stringify(options);
 assert.equal(normalizeSearch('  DËMIN '),'demin');assert.deepEqual(filterSelectOptions(options,'DEMI'),[options[0]]);assert.deepEqual(filterSelectOptions(options,'jose'),[options[1]]);assert.deepEqual(filterSelectOptions(options,'tat'),[options[2]]);assert.equal(JSON.stringify(options),before);
});
test('Empty query retains the entire available list including empty selection and duplicate names with distinct IDs',()=>{
 const options=[{value:'',label:'Todos'},{value:'1',label:'Jugador'},{value:'2',label:'Jugador'}];assert.deepEqual(filterSelectOptions(options,''),options);assert.equal(filterSelectOptions(options,'Jugador').length,2);assert.deepEqual(filterSelectOptions(options,'inexistente'),[]);
});
test('Search never reintroduces excluded players or treats a text match as identity evidence',()=>{
 const visible=[{value:'active',label:'Jugador activo'},{value:'unknown',label:'Jugador sin equipo'}];assert.equal(filterSelectOptions(visible,'Jugador').length,2);assert.deepEqual(filterSelectOptions(visible,'retirado'),[]);assert.deepEqual(filterSelectOptions([{value:'x',label:'No disponible',disabled:true}],''),[]);
});

test('Team search finds full franchise names or exact abbreviations while preserving internal codes',()=>{
 const options=[{value:'ATL',label:'Atlanta Hawks'},{value:'BOS',label:'Boston Celtics'},{value:'GSW',label:'Golden State Warriors'},{value:'LAL',label:'Los Angeles Lakers'}];
 assert.deepEqual(filterSelectOptions(options,'Hawks'),[options[0]]);
 assert.deepEqual(filterSelectOptions(options,'boston'),[options[1]]);
 assert.deepEqual(filterSelectOptions(options,'warriors'),[options[2]]);
 assert.deepEqual(filterSelectOptions(options,'GSW'),[options[2]]);
 assert.deepEqual(filterSelectOptions(options,'LAL'),[options[3]]);
});
