import {createNbaStatClient,NbaStatError} from './client.mjs';
export const ATTRIBUTION='Statistics sourced from NBA Stat and published with permission. NBA Stat is not affiliated with or endorsed by the NBA.';
// Values are NEVER included: this is structural discovery, not a box-score decoder.
export function describeStructure(body,token=''){
 const fields=new Map();let visited=0,truncated=false;
 const walk=(value,path,depth)=>{
  if(++visited>5000||depth>10){truncated=true;return;}
  const type=value===null?'null':Array.isArray(value)?'array':typeof value;
  const types=fields.get(path)||new Set();types.add(type);fields.set(path,types);
  if(Array.isArray(value)){for(const item of value.slice(0,100))walk(item,path+'[*]',depth+1);if(value.length>100)truncated=true;}
  else if(value&&typeof value==='object')for(const [key,item] of Object.entries(value)){
   if(!/^[A-Za-z_][A-Za-z_0-9]{0,63}$/.test(key)||/token|secret|password|authorization|credential|api_?key/i.test(key)||(token&&key.includes(token)))continue;
   walk(item,path+'.'+key,depth+1);
  }
 };
 walk(body,'$',0);
 return {valuesIncluded:false,truncated,fields:[...fields].sort(([a],[b])=>a.localeCompare(b)).map(([path,types])=>({path,types:[...types].sort()}))};
}
export async function runProbe({config,token,confirmation,store,fetchImpl,clock}){
 if(confirmation!=='INSPECT_1369'||config.personalPermission!=='confirmed'||config.publicJsonPermission!=='confirmed'||config.season2026Coverage!=='confirmed'||config.permissionEvidence!=='user-reported-email')throw new NbaStatError('PROBE_NOT_CONFIRMED');
 // This opt-in applies ONLY to structural inspection, never to ingestion or publication.
 const client=createNbaStatClient({config:{...config,enabled:true,mode:'private-only'},purpose:'private-inspection',token,...store,fetchImpl,clock});
 const result=await client.boxScore('1369');
 if(result.deferred)return {status:'deferred',notBefore:result.notBefore};
 return {status:'structure-only',gameId:'1369',qualityVerified:false,statisticsPublished:false,attribution:ATTRIBUTION,structure:describeStructure(result.body,token)};
}
