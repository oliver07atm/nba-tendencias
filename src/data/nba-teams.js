// BALLDONTLIE IDs are NOT ESPN IDs. The shared key is the canonical abbreviation.
export const NBA_TEAMS=Object.freeze([
 [1,'ATL','Atlanta Hawks'],[2,'BOS','Boston Celtics'],[3,'BKN','Brooklyn Nets'],[4,'CHA','Charlotte Hornets'],[5,'CHI','Chicago Bulls'],[6,'CLE','Cleveland Cavaliers'],[7,'DAL','Dallas Mavericks'],[8,'DEN','Denver Nuggets'],[9,'DET','Detroit Pistons'],[10,'GSW','Golden State Warriors'],[11,'HOU','Houston Rockets'],[12,'IND','Indiana Pacers'],[13,'LAC','LA Clippers'],[14,'LAL','Los Angeles Lakers'],[15,'MEM','Memphis Grizzlies'],[16,'MIA','Miami Heat'],[17,'MIL','Milwaukee Bucks'],[18,'MIN','Minnesota Timberwolves'],[19,'NOP','New Orleans Pelicans'],[20,'NYK','New York Knicks'],[21,'OKC','Oklahoma City Thunder'],[22,'ORL','Orlando Magic'],[23,'PHI','Philadelphia 76ers'],[24,'PHX','Phoenix Suns'],[25,'POR','Portland Trail Blazers'],[26,'SAC','Sacramento Kings'],[27,'SAS','San Antonio Spurs'],[28,'TOR','Toronto Raptors'],[29,'UTA','Utah Jazz'],[30,'WAS','Washington Wizards']
].map(([sourceId,id,name])=>Object.freeze({sourceId,id,name})));
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
