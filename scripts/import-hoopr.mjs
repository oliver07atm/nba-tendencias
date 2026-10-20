import {readFile,writeFile,mkdir,realpath,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {convertHoopr,readHooprCsv,mergeHistoricalDatasets} from '../src/data/hoopr.js';
const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){if(!['--players','--teams','--schedule','--out','--merge'].includes(args[i])||!args[i+1])throw Error('Uso: npm run import:hoopr -- --players archivo.csv --teams archivo.csv --schedule archivo.csv --out work/importacion/temporada.json [--merge work/anterior.json]');options[args[i]]=args[i+1];}
if(!['--players','--teams','--schedule','--out'].every(k=>options[k]))throw Error('Faltan archivos. Se requieren --players, --teams, --schedule y --out.');
const root=fileURLToPath(new URL('../',import.meta.url));
const reviewDir=path.join(root,'work','imports');await mkdir(reviewDir,{recursive:true});
const out=path.resolve(root,options['--out']);
// Pending rights: the command only writes a private, gitignored review copy.
const reviewRoot=await realpath(path.join(root,'work'));
if(!out.startsWith(path.join(root,'work')+path.sep))throw Error('Derechos sin verificar: la salida solo puede estar dentro de work/. No se publica en public/ o dist/.');
await mkdir(path.dirname(out),{recursive:true});const actualParent=await realpath(path.dirname(out));
if(actualParent!==reviewRoot&&!actualParent.startsWith(reviewRoot+path.sep))throw Error('La salida no puede salir de work/ mediante enlaces.');
const [players,teams,schedule]=await Promise.all(['--players','--teams','--schedule'].map(async k=>readHooprCsv(await readFile(options[k],'utf8'))));
const {dataset,report}=convertHoopr({players,teams,schedule});
const combined=options['--merge']?mergeHistoricalDatasets([JSON.parse(await readFile(options['--merge'],'utf8')),dataset]):dataset;
async function saveReview(file,content){const temp=path.join(actualParent,`.import-${randomUUID()}.tmp`);await writeFile(temp,content,{flag:'wx'});await rename(temp,file);}
await saveReview(out,JSON.stringify(combined));await saveReview(out+'.report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({output:out,records:combined.records.length,report,publication:'BLOCKED: rights and accuracy unverified'},null,2));
