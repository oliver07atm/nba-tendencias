import {validateDataset,parseImport} from '../engine.js';
import {readHooprCsv,convertHoopr,mergeHistoricalDatasets} from './hoopr.js';
export const CSV_LIMIT=64*1024*1024;
export const JSON_LIMIT=256*1024*1024;
export function asUnverifiedHistory(input){
 const data=validateDataset(input);
 if(data.meta.mode==='demo')return data;
 return {...data,meta:{...data.meta,mode:'imported',origin:'historical-unverified',accuracy:{status:'unverified'},rights:{...data.meta.rights,status:'unresolved'}}};
}
function seasonOf(rows,label,required){
 if(!rows.length)throw Error(`El CSV de ${label} está vacío.`);
 for(const key of required)if(!Object.hasOwn(rows[0],key))throw Error(`El archivo de ${label} no tiene la columna ${key}. Comprueba que no hayas intercambiado los CSV.`);
 const seasons=new Set(rows.map(r=>String(r.season).trim()));
 if(seasons.size!==1||![...seasons].every(s=>/^\d{4}$/.test(s)))throw Error(`El CSV de ${label} debe contener una única temporada, indicada por su año final.`);
 return [...seasons][0];
}
export function importSeasonTexts(texts,base=null){
 const players=readHooprCsv(texts.players),teams=readHooprCsv(texts.teams),schedule=readHooprCsv(texts.schedule);
 const years=[seasonOf(players,'jugadores',['game_id','season','athlete_id','athlete_display_name','team_id','did_not_play']),seasonOf(teams,'equipos',['game_id','season','team_id','team_score']),seasonOf(schedule,'calendario',['season','home_id','away_id','home_linescores','away_linescores'])];
 if(new Set(years).size!==1)throw Error('Los tres CSV deben pertenecer a la misma temporada. Selecciona los tres archivos correspondientes al mismo año.');
 const {dataset,report}=convertHoopr({players,teams,schedule});
 if(!dataset.records.length)throw Error('No se han encontrado actuaciones completas compatibles. Revisa los CSV, los cuartos y el formato de las estadísticas.');
 const result=combineLocalHistory(dataset,base);
 return {dataset:result,report:{...report,addedRecords:result.records.length-(base?.records.length||0),duplicates:dataset.records.length+(base?.records.length||0)-result.records.length}};
}
export function combineLocalHistory(input,base=null){
 const incoming=asUnverifiedHistory(input);
 if(incoming.meta.mode==='demo'||!base)return incoming;
 if(base.meta.mode==='demo')throw Error('La demostración no se combina con históricos.');
 return asUnverifiedHistory(mergeHistoricalDatasets([asUnverifiedHistory(base),incoming]));
}
export function importLocalFile(text,name,base=null){return combineLocalHistory(parseImport(text,name),base);}
