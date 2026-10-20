import {readFile,writeFile,rename} from 'node:fs/promises';
import {validateDataset} from '../src/engine.js';
import {assertSourceRights,assertPublishableDataset} from '../src/data/publication.js';
const config=JSON.parse(await readFile(new URL('../data-source.json',import.meta.url),'utf8'));
if(!config.enabled){console.log('Sin fuente autorizada configurada; se conserva la demostración.');process.exit(0);}
assertSourceRights(config);
const response=await fetch(config.url,{signal:AbortSignal.timeout(45000)});
if(!response.ok)throw Error(`Error de la fuente: ${response.status}. Se conserva el último archivo.`);
const text=await response.text();if(Buffer.byteLength(text)>64*1024*1024)throw Error('Archivo demasiado grande');
const data=validateDataset(JSON.parse(text));
assertPublishableDataset(data);
data.meta={...data.meta,source:config.name,licenseUrl:config.licenseUrl,updatedAt:new Date().toISOString()};
const file=new URL('../public/data/current.json',import.meta.url);await writeFile(new URL('../public/data/current.tmp',import.meta.url),JSON.stringify(data));await rename(new URL('../public/data/current.tmp',import.meta.url),file);
console.log(`Actualizados ${data.records.length} registros. Fuente: ${config.name}`);
