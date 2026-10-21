import {readFile,appendFile} from 'node:fs/promises';
import {runProbe} from './lib/nbastat/probe.mjs';
import {githubQuotaStore} from './lib/nbastat/github-quota.mjs';
import {NbaStatError} from './lib/nbastat/client.mjs';
try{
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_EVENT_NAME!=='workflow_dispatch'||process.env.GITHUB_REF!=='refs/heads/main'||process.env.CONFIRM_NBASTAT!=='INSPECT_1369'||process.env.CONFIRM_UNUSED_ACCOUNT!=='true')throw new NbaStatError('MANUAL_MAIN_PROBE_ONLY');
 const config=JSON.parse(await readFile(new URL('../nbastat-source.json',import.meta.url),'utf8'));
 const result=await runProbe({config,token:process.env.NBASTAT_API_TOKEN,confirmation:process.env.CONFIRM_NBASTAT,store:githubQuotaStore()});
 if(result.status==='deferred'){
  console.log('Prueba aplazada por cuota. Sin petición HTTP.');
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'Prueba aplazada por cuota hasta '+new Date(result.notBefore).toISOString()+'. No se hizo una petición HTTP.\n');
 }else{
  if(!process.env.GITHUB_STEP_SUMMARY)throw new NbaStatError('SUMMARY_UNAVAILABLE');
  await appendFile(process.env.GITHUB_STEP_SUMMARY,'## NBA Stat: estructura del partido 1369\n\nSin valores de estadísticas ni credenciales. Calidad e identidades pendientes; no se publica ningún box score.\n\n'+result.attribution+'\n\n```json\n'+JSON.stringify(result.structure,null,2)+'\n```\n');
  console.log('Inspección estructural completada. Consulta el resumen; estadísticas no publicadas.');
 }
}catch(error){
 // Never stringify arbitrary exceptions, HTTP bodies, request headers or environment.
 const code=error instanceof NbaStatError&&/^[A-Z_0-9]+$/.test(error.code)?error.code:'PROBE_FAILED';
 console.error('NBA Stat: '+code);process.exitCode=1;
}
