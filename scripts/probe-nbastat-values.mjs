import {readFile,writeFile,mkdir,appendFile} from 'node:fs/promises';
import {runSealedProbe} from './lib/nbastat/sealed-probe.mjs';
import {githubQuotaStore} from './lib/nbastat/github-quota.mjs';
import {NbaStatError} from './lib/nbastat/client.mjs';
try{
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_EVENT_NAME!=='workflow_dispatch'||process.env.GITHUB_REF!=='refs/heads/main'||process.env.CONFIRM_NBASTAT!=='VALIDATE_1369'||process.env.CONFIRM_UNUSED_ACCOUNT!=='true')throw new NbaStatError('MANUAL_MAIN_PROBE_ONLY');
 const config=JSON.parse(await readFile(new URL('../nbastat-source.json',import.meta.url),'utf8'));
 const result=await runSealedProbe({config,token:process.env.NBASTAT_API_TOKEN,passphrase:process.env.NBASTAT_PROBE_PASSPHRASE,confirmation:process.env.CONFIRM_NBASTAT,store:githubQuotaStore()});
 if(result.status==='deferred'){console.log('Aplazado por cuota; no hubo consulta.');if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'Prueba aplazada hasta '+new Date(result.notBefore).toISOString()+'.\n');}
 else{
  await mkdir('work/nbastat-sealed',{recursive:true,mode:0o700});await writeFile('work/nbastat-sealed/review.sealed.json',JSON.stringify(result.sealed),{mode:0o600,flag:'wx'});
  console.log('Paquete cifrado preparado. Calidad, identidades y semántica pendientes de revisión privada.');
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'## NBA Stat: revisión privada preparada\n\nEl artefacto contiene solo ciphertext autenticado AES-256-GCM. No se publican estadísticas en claro. Una ejecución verde NO acredita calidad ni identidad. Descarga y revisa el paquete localmente según docs/nbastat-valores.md. No hay sincronización ni cambios en IndexedDB.\n');
 }
}catch(e){console.error('NBA Stat: '+(e instanceof NbaStatError&&/^[A-Z_0-9]+$/.test(e.code)?e.code:'PRIVATE_PROBE_FAILED'));process.exitCode=1;}
