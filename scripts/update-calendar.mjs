import {readFile,writeFile,rename} from 'node:fs/promises';
import {refreshCalendar} from './lib/balldontlie.mjs';
import {validateSchedule} from '../src/data/schedule.js';
// This entry point is invoked only by Actions; no VITE_ env or client API calls.
if(process.env.GITHUB_ACTIONS!=='true'){console.error('La conexión autenticada solo se ejecuta en GitHub Actions.');process.exit(1);}
const file=new URL('../public/data/schedule.json',import.meta.url);let previous=null;
try{previous=validateSchedule(JSON.parse(await readFile(file,'utf8')));}catch{}
const apiKey=process.env.BALLDONTLIE_API_KEY;
const result=await refreshCalendar({apiKey,previous});
const serialized=JSON.stringify(result.snapshot);
if(apiKey&&serialized.includes(apiKey)){console.error('Salida bloqueada por seguridad. No se escribe ni publica la respuesta.');process.exit(1);}
const tmp=new URL('../public/data/schedule.tmp',import.meta.url);await writeFile(tmp,serialized);await rename(tmp,file);
if(result.ok){console.log(`Calendario actualizado: ${result.snapshot.games.length} partidos; ${result.snapshot.meta.requests} peticiones. Credencial disponible y aceptada. No se consultaron estadísticas ni alineaciones.`);}
else console.log(`::warning::Calendario sin actualizar: ${result.snapshot.meta.lastError}. Se conserva la última descarga válida con aviso visible.`);
