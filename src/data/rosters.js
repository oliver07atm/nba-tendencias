import {NBA_TEAMS} from './nba-teams.js';
import {directoryAliases,effectiveIdentities} from './player-directory.js';
import {entityKey} from '../engine.js';
export const ROSTER_SEASON='2026-27',MAX_ROSTER_AGE=7*86400000;
const teamIds={ATL:1610612737,BOS:1610612738,BKN:1610612751,CHA:1610612766,CHI:1610612741,CLE:1610612739,DAL:1610612742,DEN:1610612743,DET:1610612765,GSW:1610612744,HOU:1610612745,IND:1610612754,LAC:1610612746,LAL:1610612747,MEM:1610612763,MIA:1610612748,MIL:1610612749,MIN:1610612750,NOP:1610612740,NYK:1610612752,OKC:1610612760,ORL:1610612753,PHI:1610612755,PHX:1610612756,POR:1610612757,SAC:1610612758,SAS:1610612759,TOR:1610612761,UTA:1610612762,WAS:1610612764};
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T.*Z$/.test(v)&&Number.isFinite(Date.parse(v));
const calendarDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const positiveId=v=>typeof v==='string'&&/^[1-9]\d*$/.test(v);
function source(url,host,path){try{const u=new URL(url);return u.protocol==='https:'&&[host,'www.'+host].includes(u.hostname)&&!u.username&&!u.password&&path.test(u.pathname);}catch{return false;}}
function membershipSource(p,team){
 const m=p.membership;
 if(m?.season&&m.season!==ROSTER_SEASON)return false;
 if(source(m?.sourceUrl,'nba.com',new RegExp('^/player/'+p.ids.nba+'(?:/|$)')))return true;
 // A team roster proves membership; a player profile provides its stable ID.
 return m?.season===ROSTER_SEASON&&calendarDate(m.asOf)&&date(m.checkedAt)&&m.asOf<=m.checkedAt.slice(0,10)&&
  source(m.playerUrl,'nba.com',new RegExp('^/player/'+p.ids.nba+'(?:/|$)'))&&
  source(m.sourceUrl,'nba.com',new RegExp('^/team/'+teamIds[team]+'(?:/|$)'));
}
function espnSource(url,id){
 try{const u=new URL(url);return (source(url,'espn.com',/^\/nba\/player(?:\/|$)/)||u.protocol==='https:'&&u.hostname==='africa.espn.com'&&!u.username&&!u.password&&/^\/nba\/player\//.test(u.pathname))&&
  (new RegExp('^/nba/player/(?:[a-z]+/)?_/id/'+id+'(?:/|$)').test(u.pathname)||/^\/nba\/player(?:\/(?:bio|stats|gamelog|news|splits))?\/?$/.test(u.pathname)&&u.searchParams.get('id')===id);
 }catch{return false;}
}
export function rosterTemplate(){return {version:1,season:ROSTER_SEASON,teams:NBA_TEAMS.map(t=>({id:t.id,complete:false,checkedAt:null,sourceUrl:`https://www.nba.com/team/${teamIds[t.id]}`,players:[]}))};}
export function validateRosters(input){
 if(input?.version!==1||input.season!==ROSTER_SEASON||!Array.isArray(input.teams)||input.teams.length!==30)throw Error('Se necesita un JSON de plantillas 2026-27 con las 30 franquicias.');
 const teams=new Set(),nba=new Set(),aliases=new Set();
 for(const t of input.teams){
  if(!teamIds[t.id]||teams.has(t.id)||typeof t.complete!=='boolean'||!Array.isArray(t.players)||t.players.length>30||!source(t.sourceUrl,'nba.com',new RegExp('^/team/'+teamIds[t.id]+'(?:/|$)')))throw Error('Equipo, fuente oficial o plantilla duplicada/inválida.');teams.add(t.id);
  if(t.checkedAt!==null&&!date(t.checkedAt)||t.complete&&(!t.checkedAt||!t.players.length))throw Error('Revisión de equipo incompleta.');
  if(t.expectedCount!=null&&(!Number.isInteger(t.expectedCount)||t.expectedCount<1||t.expectedCount>30||t.complete&&t.expectedCount!==t.players.length))throw Error('El número de jugadores no coincide con la plantilla completa declarada.');
  for(const p of t.players){
   if(!positiveId(p.ids?.nba)||nba.has(p.ids.nba)||typeof p.name!=='string'||!p.name.trim()||p.name.length>100)throw Error('Jugador sin ID NBA estable, sin nombre o duplicado.');nba.add(p.ids.nba);
   if(p.ids.espn!=null&&!positiveId(p.ids.espn)||p.ids.balldontlie!=null&&!positiveId(p.ids.balldontlie))throw Error('ID externo inválido.');
   for(const key of ['espn','balldontlie'])if(p.ids[key]){const alias=key+':'+p.ids[key];if(aliases.has(alias))throw Error('Dos jugadores comparten un identificador externo.');aliases.add(alias);}
   if(!['pending','reviewed'].includes(p.membership?.status))throw Error('Indica si la pertenencia está pendiente o revisada.');
   if(p.membership.status==='reviewed'&&(!date(p.membership.checkedAt)||!membershipSource(p,t.id)||!t.checkedAt))throw Error('Falta fecha o evidencia oficial de pertenencia: perfil NBA o plantilla del equipo correcto con temporada, fecha e ID NBA.');
   if(p.identity?.status==='reviewed'){
    if(!p.ids.espn||!date(p.identity.checkedAt)||!/^\d{4}-\d{2}-\d{2}$/.test(p.identity.birthDate)||!source(p.identity.nbaUrl,'nba.com',new RegExp('^/player/'+p.ids.nba+'(?:/|$)'))||!espnSource(p.identity.espnUrl,p.ids.espn))throw Error('Cruce NBA/ESPN sin evidencias de identidad completas.');
   }
  }
 }
 return input;
}
export const rosterPlayerKey=p=>'nba:player:'+p.ids.nba;
export function identityAliases(rosters,directory){return directoryAliases(rosters,directory);}
export function playerRecords(records,rosters,directory){const aliases=identityAliases(rosters,directory);return records.map(r=>r.kind==='player'&&aliases.has(entityKey(r))?{...r,entityId:aliases.get(entityKey(r))}:r);}
export function verifiedRoster(team,rosters,now=new Date()){
 const t=rosters?.teams.find(t=>t.id===team);if(!t)return [];
 return t.players.filter(p=>membershipState(p,now)==='confirmed');
}
export function verifiedTeamMap(rosters,now){const map=new Map();for(const t of rosters?.teams||[])for(const p of verifiedRoster(t.id,rosters,now))map.set(rosterPlayerKey(p),t.id);return map;}
// Trend analysis may use the last reviewed roster with an explicit freshness
// warning. A historical game, pending membership or future review never assigns
// a player to a forthcoming opponent.
export function trendRosterMemberships(rosters,now=new Date()){
 const map=new Map();
 for(const t of rosters?.teams||[])for(const p of t.players)if(rosters.season===ROSTER_SEASON&&p.membership?.status==='reviewed'&&(!p.membership.season||p.membership.season===rosters.season)&&Number.isFinite(Date.parse(p.membership.checkedAt))&&Date.parse(p.membership.checkedAt)<=Number(now))map.set(rosterPlayerKey(p),{team:t.id,name:p.name,state:membershipState(p,now),checkedAt:p.membership.checkedAt});
 return map;
}
export function rosterPlayer(rosters,key,directory){const id=identityAliases(rosters,directory).get(key)||key;return rosters?.teams.flatMap(t=>t.players).find(p=>rosterPlayerKey(p)===id);}

// Freshness classifies the evidence; it never removes access to a player.
export function membershipState(player,now=new Date()){
 if(player?.membership?.status!=='reviewed')return 'pending';
 const age=new Date(now)-new Date(player.membership.checkedAt);
 return Number.isFinite(age)&&age>=0&&age<=MAX_ROSTER_AGE?'confirmed':'outdated';
}
export function teamPlayerSections(team,records,rosters,now=new Date(),directory){
 const aliases=identityAliases(rosters,directory),identities=effectiveIdentities(rosters,directory),keyOf=r=>aliases.get(entityKey(r))||entityKey(r);
 const histories=new Map();
 // Team association chooses the list only. Analysis remains keyed by player
 // across ALL records, including previous teams and seasons.
 for(const row of records)if(row.kind==='player'&&row.team===team){const key=keyOf(row);if(!histories.has(key))histories.set(key,{key,name:row.entity});}
 const allStats=new Set(records.filter(r=>r.kind==='player').map(keyOf));
 const currentTeams=verifiedTeamMap(rosters,now),confirmed=[],others=new Map(histories);
 const entries=rosters?.teams.find(t=>t.id===team)?.players||[];
 for(const player of entries){
  const key=rosterPlayerKey(player),state=membershipState(player,now);
  const out={key,name:player.name,state,checkedAt:date(player.membership.checkedAt)?player.membership.checkedAt:null,asOf:calendarDate(player.membership.asOf)?player.membership.asOf:null,source:membershipSource(player,team)?player.membership.sourceUrl:null,identityLinked:identities.has(player.ids.nba),hasStats:allStats.has(key)};
  if(state==='confirmed'){confirmed.push(out);others.delete(key);}else others.set(key,out);
 }
 const otherPlayers=[...others.values()].map(p=>({...p,state:p.state||'pending',hasStats:allStats.has(p.key),confirmedTeam:currentTeams.get(p.key)||null}));
 const sort=(a,b)=>a.name.localeCompare(b.name,'es')||a.key.localeCompare(b.key);
 return {confirmed:confirmed.sort(sort),others:otherPlayers.sort(sort)};
}
export function rosterCoverage(rosters,now=new Date(),directory){
 const identities=effectiveIdentities(rosters,directory);
 return NBA_TEAMS.map(team=>{const t=rosters?.teams.find(t=>t.id===team.id),entries=t?.players||[],confirmed=entries.filter(p=>membershipState(p,now)==='confirmed').length;return {...team,registered:entries.length,confirmed,linked:entries.filter(p=>identities.has(p.ids.nba)).length,awaitingReview:entries.length-confirmed,complete:t?.complete===true&&confirmed===entries.length&&confirmed>0};});
}
