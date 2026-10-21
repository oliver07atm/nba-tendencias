import {setTimeout as sleep} from 'node:timers/promises';
import {normalizeGame,validateSchedule,canaryDay,addDays} from '../../src/data/schedule.js';
export class CalendarError extends Error{constructor(code){super(code);this.code=code;}}
export const CALENDAR_BUDGET={requests:22,durationMs:330000,spacingMs:13000,scanDays:7};
export function calendarSeason(now=new Date()){const today=canaryDay(now);return Number(today.slice(0,4))-(Number(today.slice(5,7))<7?1:0);}
export function needsSeasonScan(previous,now=new Date()){
 const scan=previous?.meta.seasonScan;
 return scan?.year!==calendarSeason(now)||!Number.isFinite(Date.parse(scan?.completedAt))||new Date(now)-new Date(scan.completedAt)>=CALENDAR_BUDGET.scanDays*86400000;
}
export async function fetchCalendar({apiKey,now=new Date(),fetchImpl=fetch,wait=sleep,clock=()=>Date.now(),strategy='window',previous=null,initialDelayMs=0}){
 if(!apiKey)throw new CalendarError('SECRET_MISSING');
 const today=canaryDay(now),start=addDays(today,-8),end=addDays(today,30),season=calendarSeason(now),started=clock();
 const stamp=()=>new Date(new Date(now).getTime()+clock()-started).toISOString();
 const deadline=started+CALENDAR_BUDGET.durationMs;let lastRequest=null,requests=0;
 const checkBudget=(extra=0)=>{if(requests>=CALENDAR_BUDGET.requests||clock()+extra>=deadline)throw new CalendarError('REQUEST_BUDGET');};
 const pause=async ms=>{checkBudget(ms);if(ms>0)await wait(ms);};
 const request=async url=>{
  for(let attempt=0;attempt<3;attempt++){
   checkBudget();if(lastRequest!==null)await pause(Math.max(0,CALENDAR_BUDGET.spacingMs-(clock()-lastRequest)));
   checkBudget();lastRequest=clock();requests++;
   let response;try{response=await fetchImpl(url,{headers:{Authorization:apiKey,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(Math.max(1,Math.min(30000,deadline-clock())))});}catch{if(attempt<2){await pause(13000);continue;}throw new CalendarError('NETWORK');}
   if(response.status===429||response.status>=500){
    if(attempt<2){const header=response.headers.get('retry-after'),seconds=Number(header),retry=header?(Number.isFinite(seconds)?seconds*1000:Date.parse(header)-clock()):60000;if(retry>60000)throw new CalendarError('HTTP_'+response.status);await pause(Math.max(13000,Number.isFinite(retry)?retry:60000));continue;}
   }
   if(!response.ok)throw new CalendarError('HTTP_'+response.status);
   try{return await response.json();}catch{throw new CalendarError('INVALID_RESPONSE');}
  }
 };
 if(initialDelayMs)await pause(initialDelayMs);
 const fresh=new Map();let unassigned=0;
 const accept=raw=>{if(raw?.home_team===null||raw?.visitor_team===null){unassigned++;return null;}try{const g={...normalizeGame(raw),observedAt:stamp()};fresh.set(g.id,g);return g;}catch{throw new CalendarError('INVALID_GAME');}};
 let cursor=null;const seen=new Set();let complete=false;
 for(let page=0;page<20;page++){
  const url=new URL('https://api.balldontlie.io/v1/games');url.searchParams.set('per_page','100');
  if(strategy==='season')url.searchParams.set('seasons[]',String(season));
  else {url.searchParams.set('start_date',start);url.searchParams.set('end_date',end);}
  if(cursor!==null)url.searchParams.set('cursor',String(cursor));
  const body=await request(url);if(!Array.isArray(body?.data)||!body.meta)throw new CalendarError('INVALID_RESPONSE');
  for(const raw of body.data){if(strategy==='season'&&raw.season!=null&&raw.season!==season)throw new CalendarError('INVALID_SEASON');accept(raw);}
  const next=body.meta.next_cursor;
  if(next==null){complete=true;break;}
  if(!Number.isSafeInteger(next)||next<0||seen.has(next)||body.data.length===0)throw new CalendarError('INVALID_PAGINATION');seen.add(next);cursor=next;
 }
 if(!complete)throw new CalendarError('PAGE_LIMIT');
 const previousGames=previous?validateSchedule(previous).games:[],overdue=previousGames.filter(g=>!['final','canceled'].includes(g.status)&&g.day<addDays(today,-7)&&!fresh.has(g.id)).sort((a,b)=>(a.lastCheckAttemptAt||a.observedAt||'').localeCompare(b.lastCheckAttemptAt||b.observedAt||'')||a.day.localeCompare(b.day));
 let rechecked=0,recheckError=null;const attempts=new Map(),failures=[];
 if(strategy==='incremental')for(const g of overdue.slice(0,12)){
  try{const body=await request(new URL('https://api.balldontlie.io/v1/games/'+g.id.split(':').pop()));if(!body?.data||body.data.id!==Number(g.id.split(':').pop()))throw new CalendarError('INVALID_GAME');if(!accept(body.data))throw new CalendarError('UNASSIGNED_GAME');rechecked++;}
  catch(error){recheckError=error instanceof CalendarError?error.code:'INVALID_RESPONSE';attempts.set(g.id,stamp());failures.push({id:g.id,code:recheckError});if(recheckError!=='HTTP_404')break;}
 }
 // Upsert by source ID; missing entries never erase already downloaded games.
 const games=new Map(strategy==='window'?[]:previousGames.map(g=>[g.id,{...g,observedAt:g.observedAt||previous.meta.updatedAt}]));
 for(const [id,lastCheckAttemptAt] of attempts)games.set(id,{...games.get(id),lastCheckAttemptAt});
 for(const g of fresh.values())if(strategy!=='window'||g.day>=addDays(today,-7)&&g.day<=end)games.set(g.id,g);
 const updatedAt=stamp(),values=[...games.values()],days=values.map(g=>g.day).sort(),seasonScan=strategy==='season'?{year:season,completedAt:updatedAt,returnedGames:fresh.size}:previous?.meta.seasonScan||null;
 return validateSchedule({meta:{source:'BALLDONTLIE',endpoint:'/v1/games',updatedAt,lastAttemptAt:updatedAt,lastError:null,strategy,seasonScan,
  coverage:{from:days[0]||null,to:days.at(-1)||null},recentWindow:{from:addDays(today,-7),to:end},requests,fetchedGameCount:fresh.size,gameCount:games.size,
  unassigned,recheck:{checked:rechecked,remaining:overdue.length-rechecked,error:recheckError,failures},archive:{retainedFinals:previousGames.filter(g=>g.status==='final'&&!fresh.has(g.id)).length,notice:'Los partidos no reconsultados conservan su fecha de consulta original.'}},games:values});
}
export async function refreshCalendar({previous=null,...options}){
 try{return {snapshot:await fetchCalendar({...options,previous,strategy:needsSeasonScan(previous,options.now)?'season':'incremental'}),ok:true};}
 catch(error){
  const safeCode=error instanceof CalendarError?error.code:'INVALID_RESPONSE',base=previous?validateSchedule(previous):{meta:{source:'BALLDONTLIE',updatedAt:null},games:[]};
  return {snapshot:{...base,meta:{...base.meta,lastAttemptAt:new Date(options.now||Date.now()).toISOString(),lastError:safeCode}},ok:false};
 }
}
