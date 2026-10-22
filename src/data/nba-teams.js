// Explicit current franchise nicknames: exact labels only, no suffix or fuzzy matching.
const nicknames=Object.freeze({ATL:'Hawks',BOS:'Celtics',BKN:'Nets',CHA:'Hornets',CHI:'Bulls',CLE:'Cavaliers',DAL:'Mavericks',DEN:'Nuggets',DET:'Pistons',GSW:'Warriors',HOU:'Rockets',IND:'Pacers',LAC:'Clippers',LAL:'Lakers',MEM:'Grizzlies',MIA:'Heat',MIL:'Bucks',MIN:'Timberwolves',NOP:'Pelicans',NYK:'Knicks',OKC:'Thunder',ORL:'Magic',PHI:'76ers',PHX:'Suns',POR:'Trail Blazers',SAC:'Kings',SAS:'Spurs',TOR:'Raptors',UTA:'Jazz',WAS:'Wizards'});
// BALLDONTLIE IDs are NOT ESPN IDs. The shared key is the canonical abbreviation.
export const NBA_TEAMS=Object.freeze([
 [1,'ATL','Atlanta Hawks'],[2,'BOS','Boston Celtics'],[3,'BKN','Brooklyn Nets'],[4,'CHA','Charlotte Hornets'],[5,'CHI','Chicago Bulls'],[6,'CLE','Cleveland Cavaliers'],[7,'DAL','Dallas Mavericks'],[8,'DEN','Denver Nuggets'],[9,'DET','Detroit Pistons'],[10,'GSW','Golden State Warriors'],[11,'HOU','Houston Rockets'],[12,'IND','Indiana Pacers'],[13,'LAC','LA Clippers'],[14,'LAL','Los Angeles Lakers'],[15,'MEM','Memphis Grizzlies'],[16,'MIA','Miami Heat'],[17,'MIL','Milwaukee Bucks'],[18,'MIN','Minnesota Timberwolves'],[19,'NOP','New Orleans Pelicans'],[20,'NYK','New York Knicks'],[21,'OKC','Oklahoma City Thunder'],[22,'ORL','Orlando Magic'],[23,'PHI','Philadelphia 76ers'],[24,'PHX','Phoenix Suns'],[25,'POR','Portland Trail Blazers'],[26,'SAC','Sacramento Kings'],[27,'SAS','San Antonio Spurs'],[28,'TOR','Toronto Raptors'],[29,'UTA','Utah Jazz'],[30,'WAS','Washington Wizards']
].map(([sourceId,id,name])=>Object.freeze({sourceId,id,name,nickname:nicknames[id]})));
export function exactTeamName(value){
 const matches=NBA_TEAMS.filter(t=>t.name===value||t.nickname===value);
 return matches.length===1?matches[0].id:null;
}
const aliases={BRK:'BKN',CHO:'CHA',GS:'GSW',NY:'NYK',NO:'NOP',PHO:'PHX',SA:'SAS',UTAH:'UTA',WSH:'WAS'};
export function canonicalTeam(abbreviation){const key=String(abbreviation??'').trim().toUpperCase();return aliases[key]||key;}
export function ballTeam(team){
 const mapped=NBA_TEAMS.find(t=>t.sourceId===Number(team?.id));
 if(!mapped||canonicalTeam(team?.abbreviation)!==mapped.id)throw Error('Equipo BALLDONTLIE desconocido o identificador incompatible');
 return mapped.id;
}
// Read-only view; imported/exported datasets and IndexedDB are never rewritten.
export function canonicalRecords(records){return records.map(r=>{
 const team=canonicalTeam(r.team),opponent=canonicalTeam(r.opponent);
 return team===r.team&&opponent===r.opponent?r:{...r,team,opponent,...(r.kind==='team'?{entity:team,entityId:team}:{})};
});}
