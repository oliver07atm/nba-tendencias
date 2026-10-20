import {NBA_TEAMS} from './nba-teams.js';
import {entityKey} from '../engine.js';
export const ROSTER_SEASON='2026-27',MAX_ROSTER_AGE=7*86400000;
const teamIds={ATL:1610612737,BOS:1610612738,BKN:1610612751,CHA:1610612766,CHI:1610612741,CLE:1610612739,DAL:1610612742,DEN:1610612743,DET:1610612765,GSW:1610612744,HOU:1610612745,IND:1610612754,LAC:1610612746,LAL:1610612747,MEM:1610612763,MIA:1610612748,MIL:1610612749,MIN:1610612750,NOP:1610612740,NYK:1610612752,OKC:1610612760,ORL:1610612753,PHI:1610612755,PHX:1610612756,POR:1610612757,SAC:1610612758,SAS:1610612759,TOR:1610612761,UTA:1610612762,WAS:1610612764};
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T.*Z$/.test(v)&&Number.isFinite(Date.parse(v));
const positiveId=v=>typeof v==='string'&&/^[1-9]\d*$/.test(v);
function source(url,host,path){try{const u=new URL(url);return u.protocol==='https:'&&[host,'www.'+host].includes(u.hostname)&&!u.username&&!u.password&&path.test(u.pathname);}catch{return false;}}
export function rosterTemplate(){return {version:1,season:ROSTER_SEASON,teams:NBA_TEAMS.map(t=>({id:t.id,complete:false,checkedAt:null,sourceUrl:`https://www.nba.com/team/${teamIds[t.id]}`,players:[]}))};}
export function validateRosters(input){
 if(input?.version!==1||input.season!==ROSTER_SEASON||!Array.isArray(input.teams)||input.teams.length!==30)throw Error('Se necesita un JSON de plantillas 2026-27 con las 30 franquicias.');
 const teams=new Set(),nba=new Set(),aliases=new Set();
 for(const t of input.teams){
  if(!teamIds[t.id]||teams.has(t.id)||typeof t.complete!=='boolean'||!Array.isArray(t.players)||t.players.length>30||!source(t.sourceUrl,'nba.com',new RegExp('^/team/'+teamIds[t.id]+'(?:/|$)')))throw Error('Equipo, fuente oficial o plantilla duplicada/inválida.');teams.add(t.id);
  if(t.checkedAt!==null&&!date(t.checkedAt)||t.complete&&(!t.checkedAt||!t.players.length))throw Error('Revisión de equipo incompleta.');
  for(const p of t.players){
   if(!positiveId(p.ids?.nba)||nba.has(p.ids.nba)||typeof p.name!=='string'||!p.name.trim()||p.name.length>100)throw Error('Jugador sin ID NBA estable, sin nombre o duplicado.');nba.add(p.ids.nba);
   if(p.ids.espn!=null&&!positiveId(p.ids.espn)||p.ids.balldontlie!=null&&!positiveId(p.ids.balldontlie))throw Error('ID externo inválido.');
   for(const key of ['espn','balldontlie'])if(p.ids[key]){const alias=key+':'+p.ids[key];if(aliases.has(alias))throw Error('Dos jugadores comparten un identificador externo.');aliases.add(alias);}
   if(!['pending','reviewed'].includes(p.membership?.status))throw Error('Indica si la pertenencia está pendiente o revisada.');
   if(p.membership.status==='reviewed'&&(!date(p.membership.checkedAt)||!source(p.membership.sourceUrl,'nba.com',new RegExp('^/player/'+p.ids.nba+'(?:/|$)'))||!t.checkedAt))throw Error('Falta fecha o perfil oficial de la pertenencia revisada.');
   if(p.identity?.status==='reviewed'){
    if(!p.ids.espn||!date(p.identity.checkedAt)||!/^\d{4}-\d{2}-\d{2}$/.test(p.identity.birthDate)||!source(p.identity.nbaUrl,'nba.com',new RegExp('^/player/'+p.ids.nba+'(?:/|$)'))||!source(p.identity.espnUrl,'espn.com',new RegExp('^/nba/player/(?:bio/)?_/id/'+p.ids.espn+'(?:/|$)')))throw Error('Cruce NBA/ESPN sin evidencias de identidad completas.');
   }
  }
 }
 return input;
}
export const rosterPlayerKey=p=>'nba:player:'+p.ids.nba;
export function identityAliases(rosters){
 const map=new Map();for(const t of rosters?.teams||[])for(const p of t.players){const key=rosterPlayerKey(p);map.set(key,key);if(p.identity?.status==='reviewed'&&p.ids.espn)map.set('espn:player:'+p.ids.espn,key);}
 return map;
}
export function playerRecords(records,rosters){const aliases=identityAliases(rosters);return records.map(r=>r.kind==='player'&&aliases.has(entityKey(r))?{...r,entityId:aliases.get(entityKey(r))}:r);}
export function verifiedRoster(team,rosters,now=new Date()){
 const t=rosters?.teams.find(t=>t.id===team);if(!t)return [];
 return t.players.filter(p=>p.membership.status==='reviewed'&&new Date(now)-new Date(p.membership.checkedAt)>=0&&new Date(now)-new Date(p.membership.checkedAt)<=MAX_ROSTER_AGE);
}
export function verifiedTeamMap(rosters,now){const map=new Map();for(const t of rosters?.teams||[])for(const p of verifiedRoster(t.id,rosters,now))map.set(rosterPlayerKey(p),t.id);return map;}
export function rosterPlayer(rosters,key){const id=identityAliases(rosters).get(key)||key;return rosters?.teams.flatMap(t=>t.players).find(p=>rosterPlayerKey(p)===id);}
