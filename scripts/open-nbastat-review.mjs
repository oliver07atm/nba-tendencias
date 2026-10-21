// Offline only: no HTTP, token, GitHub access, browser or IndexedDB.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {openProbe} from './lib/nbastat/sealed-probe.mjs';
try{
 const input=process.argv[2],output=resolve(process.argv[3]||'work/nbastat-private-review.json'),root=resolve('work')+sep;
 if(!input||!output.startsWith(root))throw Error();
 const raw=await readFile(input,'utf8');if(raw.length>20*1024*1024)throw Error();
 const payload=openProbe(JSON.parse(raw),process.env.NBASTAT_PROBE_PASSPHRASE);
 await writeFile(output,JSON.stringify(payload,null,2),{mode:0o600,flag:'wx'});console.log('Revisión descifrada exclusivamente en work/. No subir ni publicar.');
}catch{console.error('No se pudo abrir el paquete. Comprueba contraseña, archivo y carpeta work/; no se sobrescriben archivos.');process.exitCode=1;}
