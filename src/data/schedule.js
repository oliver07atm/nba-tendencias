import {ballTeam,NBA_TEAMS} from './nba-teams.js';
export const SCHEDULE_SOURCE='BALLDONTLIE';
export const STATUS_LABELS={scheduled:'Pendiente',in_progress:'En juego',final:'Finalizado',postponed:'Aplazado',canceled:'Cancelado',delayed:'Retrasado',suspended:'Suspendido',abandoned:'Interrumpido',unknown:'Estado sin confirmar'};
export function canaryDay(date=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Atlantic/Canary',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(date));
 return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');
}
export function addDays(day,days){return new Date(Date.parse(day+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);}
export function gameState(game){
 if(game.postponed===true)return 'postponed';
 if(Object.hasOwn(STATUS_LABELS,game.status_state))return game.status_state;
 const s=String(game.status||'').trim();
 if(/^final\b/i.test(s))return 'final';
 if(/postpon/i.test(s))return 'postponed';
 if(/cancel/i.test(s))return 'canceled';
 if(/suspend/i.test(s))return 'suspended';
 if(/delay/i.test(s))return 'delayed';
 if(/^(?:[1-9]\d*(?:st|nd|rd|th)?\s*(?:qtr|quarter|ot)|halftime|end of)/i.test(s)||Number(game.period)>0)return 'in_progress';
 if(/\d{1,2}:\d{2}\s*(?:am|pm)\s*(?:ET|EST|EDT)/i.test(s)||/^(?:scheduled|tbd)$/i.test(s))return 'scheduled';
 return 'unknown';
}
const isoDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));
const validDay=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
export function normalizeGame(g){
 if(!Number.isSafeInteger(g.id)||g.id<=0)throw Error('Identificador de partido inválido');
 const home=ballTeam(g.home_team),away=ballTeam(g.visitor_team);if(home===away)throw Error('Rivales idénticos');
 // Never derive a start time from a date-only field or an ambiguous status string.
 const date=isoDate(g.datetime)?new Date(g.datetime).toISOString():null;
 const sourceDate=String(g.date||'').slice(0,10);if(!validDay(sourceDate))throw Error('Fecha de partido inválida');
 const state=gameState(g);
 const score=n=>Number.isInteger(n)&&n>=0?n:null;
 return {id:`bdl:game:${g.id}`,sourceId:g.id,home,away,date,day:date?canaryDay(date):sourceDate,sourceDate,status:state,
  homeScore:['final','in_progress','suspended','abandoned'].includes(state)?score(g.home_team_score):null,
  awayScore:['final','in_progress','suspended','abandoned'].includes(state)?score(g.visitor_team_score):null,
  competition:g.postseason===true?'Playoffs':g.ist_stage?'NBA Cup':'NBA',source:SCHEDULE_SOURCE};
}
export function sortGames(games){return [...games].sort((a,b)=>a.day.localeCompare(b.day)||(a.date||`${a.day}T23:59:59Z`).localeCompare(b.date||`${b.day}T23:59:59Z`)||a.id.localeCompare(b.id));}
export function validateSchedule(input){
 if(!input||input.meta?.source!==SCHEDULE_SOURCE||!Array.isArray(input.games)||input.games.length>5000)throw Error('Calendario no compatible');
 if(input.meta.updatedAt!==null&&!isoDate(input.meta.updatedAt))throw Error('Fecha de actualización inválida');
 if(input.meta.updatedAt===null&&input.games.length)throw Error('Calendario sin procedencia temporal');
 const ids=new Set();for(const g of input.games){
  if(typeof g.id!=='string'||!/^bdl:game:\d+$/.test(g.id)||ids.has(g.id)||!NBA_TEAMS.some(t=>t.id===g.home)||!NBA_TEAMS.some(t=>t.id===g.away)||g.home===g.away||!validDay(g.day)||g.date!==null&&(!isoDate(g.date)||canaryDay(g.date)!==g.day)||!Object.hasOwn(STATUS_LABELS,g.status))throw Error('Partido de calendario inválido');
  ids.add(g.id);for(const k of ['homeScore','awayScore'])if(g[k]!==null&&(!Number.isInteger(g[k])||g[k]<0))throw Error('Marcador inválido');
  if(g.observedAt!==undefined&&!isoDate(g.observedAt))throw Error('Fecha de consulta del partido inválida');
 }
 return {...input,games:sortGames(input.games)};
}
export function calendarWarning(snapshot,loadError='',now=new Date()){
 if(loadError)return loadError;
 if(!snapshot?.meta.updatedAt)return 'Todavía no hay una descarga válida del calendario. No se muestran partidos ficticios.';
 if(snapshot.meta.lastError)return `La última consulta falló (${snapshot.meta.lastError}). Se conserva la última descarga válida.`;
 if(new Date(now)-new Date(snapshot.meta.updatedAt)>36*3600000)return 'El calendario lleva más de 36 horas sin actualizarse. Los horarios y estados pueden haber cambiado.';
 return '';
}
export function upcomingGames(snapshot,now=new Date()){const today=canaryDay(now),end=addDays(today,14);return (snapshot?.games||[]).filter(g=>g.day>=today&&g.day<=end&&['scheduled','in_progress','delayed'].includes(g.status));}
