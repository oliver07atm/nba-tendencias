import {canaryDay,addDays,sortGames,STATUS_LABELS} from './schedule.js';
import {NBA_TEAMS} from './nba-teams.js';
export const validMonth=v=>/^\d{4}-(?:0[1-9]|1[0-2])$/.test(v||'');
export const validCalendarDay=v=>/^\d{4}-(?:0[1-9]|1[0-2])-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
export function shiftMonth(month,offset){const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+offset);return d.toISOString().slice(0,7);}
export function monthDays(month){
 const start=month+'-01',offset=(new Date(start+'T12:00:00Z').getUTCDay()+6)%7,end=shiftMonth(month,1)+'-01',days=[];
 for(let day=start;day<end;day=addDays(day,1))days.push(day);
 return [...Array(offset).fill(null),...days,...Array((7-(offset+days.length)%7)%7).fill(null)];
}
export function calendarFilters(search,now=new Date()){
 const p=new URLSearchParams(search),today=canaryDay(now),view=p.get('calendarView')==='cards'?'cards':'month';
 return {view,range:['next','day','month','all'].includes(p.get('calendarRange'))?p.get('calendarRange'):view==='month'?'month':'next',month:validMonth(p.get('calendarMonth'))?p.get('calendarMonth'):validCalendarDay(p.get('calendarDay'))?p.get('calendarDay').slice(0,7):today.slice(0,7),day:validCalendarDay(p.get('calendarDay'))?p.get('calendarDay'):today,team:NBA_TEAMS.some(t=>t.id===p.get('calendarTeam'))?p.get('calendarTeam'):'',status:Object.hasOwn(STATUS_LABELS,p.get('calendarStatus'))?p.get('calendarStatus'):'',page:Math.max(1,Math.min(10000,Math.floor(Number(p.get('calendarPage'))||1)))};
}
export function calendarSearch(search,patch){const p=new URLSearchParams(search);if(!Object.hasOwn(patch,'calendarPage'))p.delete('calendarPage');for(const [k,v] of Object.entries(patch))v===null||v===''?p.delete(k):p.set(k,String(v));return p.size?'?'+p.toString():'';}
export function filterCalendarGames(games,filters,now=new Date()){
 const today=canaryDay(now),end=addDays(today,14);
 return sortGames(games.filter(g=>(!filters.team||g.home===filters.team||g.away===filters.team)&&(!filters.status||g.status===filters.status)&&(filters.range==='all'||(filters.range==='day'?g.day===filters.day:filters.range==='month'?g.day.startsWith(filters.month):g.day>=today&&g.day<=end))));
}
export function calendarPage(games,page,size=30){const pages=Math.max(1,Math.ceil(games.length/size)),current=Math.min(pages,Math.max(1,page));return {page:current,pages,games:games.slice((current-1)*size,current*size)};}
