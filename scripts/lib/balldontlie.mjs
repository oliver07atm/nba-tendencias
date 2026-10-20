import {setTimeout as sleep} from 'node:timers/promises';
import {normalizeGame,validateSchedule,canaryDay,addDays} from '../../src/data/schedule.js';
export class CalendarError extends Error{constructor(code){super(code);this.code=code;}}
export async function fetchCalendar({apiKey,now=new Date(),fetchImpl=fetch,wait=sleep,clock=()=>Date.now()}){
 if(!apiKey)throw new CalendarError('SECRET_MISSING');
 const today=canaryDay(now),start=addDays(today,-8),end=addDays(today,30);
 let lastRequest=null,requests=0,cursor=null;const seen=new Set(),games=new Map();
 const request=async url=>{
  for(let attempt=0;attempt<3;attempt++){
   if(lastRequest!==null){const delay=Math.max(0,13000-(clock()-lastRequest));if(delay)await wait(delay);}
   lastRequest=clock();requests++;
   let response;try{response=await fetchImpl(url,{headers:{Authorization:apiKey,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(30000)});}catch{if(attempt<2){await wait(13000);continue;}throw new CalendarError('NETWORK');}
   if(response.status===429||response.status>=500){
    if(attempt<2){
     const header=response.headers.get('retry-after');const seconds=Number(header);
     const retry=header?(Number.isFinite(seconds)?seconds*1000:Date.parse(header)-clock()):60000;
     if(retry>60000)throw new CalendarError('HTTP_'+response.status);
     await wait(Math.max(13000,Number.isFinite(retry)?retry:60000));continue;
    }
   }
   if(!response.ok)throw new CalendarError('HTTP_'+response.status);
   let body;try{body=await response.json();}catch{throw new CalendarError('INVALID_RESPONSE');}
   if(!Array.isArray(body?.data)||!body.meta)throw new CalendarError('INVALID_RESPONSE');
   return body;
  }
 };
 for(let page=0;page<20;page++){
  const url=new URL('https://api.balldontlie.io/v1/games');url.searchParams.set('per_page','100');url.searchParams.set('start_date',start);url.searchParams.set('end_date',end);if(cursor!==null)url.searchParams.set('cursor',String(cursor));
  const body=await request(url);
  try{for(const raw of body.data){const g=normalizeGame(raw);games.set(g.id,g);}}catch{throw new CalendarError('INVALID_GAME');}
  const next=body.meta.next_cursor;
  if(next==null){
   const updatedAt=new Date(now).toISOString();
   const published=[...games.values()].filter(g=>g.day>=addDays(today,-7)&&g.day<=end);
   return validateSchedule({meta:{source:'BALLDONTLIE',endpoint:'/v1/games',updatedAt,lastAttemptAt:updatedAt,lastError:null,coverage:{from:addDays(today,-7),to:end},requests,fetchedGameCount:games.size,gameCount:published.length},games:published});
  }
  if(!Number.isSafeInteger(next)||next<0||seen.has(next)||body.data.length===0)throw new CalendarError('INVALID_PAGINATION');
  seen.add(next);cursor=next;
 }
 throw new CalendarError('PAGE_LIMIT');
}
export async function refreshCalendar({previous=null,...options}){
 try{return {snapshot:await fetchCalendar(options),ok:true};}
 catch(error){
  const safeCode=error instanceof CalendarError?error.code:'INVALID_RESPONSE';
  const base=previous?validateSchedule(previous):{meta:{source:'BALLDONTLIE',updatedAt:null},games:[]};
  return {snapshot:{...base,meta:{...base.meta,lastAttemptAt:new Date(options.now||Date.now()).toISOString(),lastError:safeCode}},ok:false};
 }
}
