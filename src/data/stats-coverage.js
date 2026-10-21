import {canaryDay} from './schedule.js';
import {canonicalTeam} from './nba-teams.js';

export const STATS_UPDATE_STATUS={enabled:false,reviewedAt:'2026-10-21',reason:'NBA Stat autorizado según confirmación del usuario; importación privada en pruebas. Sincronización automática pendiente de validar cobertura, identidades y entrega incremental.'};
export const STATS_SOURCES=[
 {name:'NBA Stat',url:'https://nbastat.io/developers/api',result:'Permiso específico comunicado por el usuario. Importación privada del caso 1369 con revisión declarada e identidades contrastadas; automatización desactivada. Sin cuartos ni box score completo de equipos.'},
 {name:'BALLDONTLIE',url:'https://docs.balldontlie.io/',result:'Calendario conectado. Game Player Stats y Box Scores no están incluidos en el plan gratuito.'},
 {name:'API-NBA / API-SPORTS',url:'https://api-sports.io/terms',result:'100 consultas/día anunciadas. Actuaciones y cuartos documentados; permisos de publicación y uso relacionado con apuestas pendientes. Sin conexión ni clave configurada.'},
 {name:'Highlightly',url:'https://highlightly.net/terms/',result:'Box scores documentados. La sección 7 restringe el uso para apoyar operaciones de apuestas; no se presume una excepción para este proyecto.'},
 {name:'NBA.com',url:'https://www.nba.com/termsofuse',result:'No conectada: restricciones de uso para apuestas y bases estadísticas actualizadas (§9).'},
 {name:'SportsDataverse / ESPN',url:'https://disneytermsofuse.com/english/',result:'Importación personal existente. No se ha acreditado autorización para extracción automática y redistribución pública de las fuentes originales.'},
 {name:'TheSportsDB',url:'https://www.thesportsdb.com/docs_api_guide.php',result:'API gratuita con límites. No se ha acreditado cobertura completa de actuaciones NBA y cuartos, ni los permisos necesarios para este uso.'}
];
const matchup=(home,away,day)=>`${canonicalTeam(home)}|${canonicalTeam(away)}|${day}`;
function sourceGameKey(r){
 // Never equate a bare numeric ESPN game ID with a BALLDONTLIE ID.
 return /^((?:espn|nba|bdl|nbastat):game:[^:]+):(?:player|team):/.exec(r.id||'')?.[1]||null;
}

// Read-only diagnostics, not an identity join or a completeness certificate.
// Matching needs the same Canary day, home/away teams and ONE source game.
export function statsCoverage(records=[],snapshot=null,{mode='imported'}={}){
 const demo=mode==='demo',groups=new Map(),latestByEntity=new Map(),dates=new Map();let latestPlayer=null,latestTeam=null;
 for(const r of demo?[]:records){
  // Many rows share a game timestamp: format it once, not once per player.
  if(!dates.has(r.date))dates.set(r.date,Number.isFinite(Date.parse(r.date))?{day:canaryDay(r.date),iso:new Date(r.date).toISOString()}:null);
  const timestamp=dates.get(r.date);if(!timestamp)continue;const date=timestamp.day,iso=timestamp.iso;
  if(r.kind==='player'){if(!latestPlayer||iso>latestPlayer)latestPlayer=iso;}
  if(r.kind==='team'){if(!latestTeam||iso>latestTeam)latestTeam=iso;}
  const entity=r.entityId||r.entity,previous=latestByEntity.get(entity);if(!previous||iso>previous)latestByEntity.set(entity,iso);
  const sourceId=sourceGameKey(r);if(!sourceId)continue;
  const home=r.venue==='home'?r.team:r.opponent,away=r.venue==='away'?r.team:r.opponent,key=matchup(home,away,date);
  if(!groups.has(key))groups.set(key,new Map());const games=groups.get(key);
  if(!games.has(sourceId))games.set(sourceId,{teams:[],players:[]});
  const bucket=games.get(sourceId);if(r.kind==='team')bucket.teams.push(r);else if(r.kind==='player')bucket.players.push(r);
 }
 const finals=(snapshot?.games||[]).filter(g=>g.status==='final').map(g=>{
  const candidates=groups.get(matchup(g.home,g.away,g.day));
  const base={id:g.id,home:g.home,away:g.away,day:g.day,homeScore:g.homeScore,awayScore:g.awayScore,observedAt:g.observedAt||snapshot?.meta.updatedAt};
  if(demo)return {...base,state:'demo',playerRecords:0,teamRecords:0};
  if(!candidates)return {...base,state:g.date?'missing':'unknown-time',playerRecords:0,teamRecords:0};
  // A date-only schedule cannot establish the same local day across sources.
  if(!g.date||candidates.size!==1)return {...base,state:'ambiguous',playerRecords:0,teamRecords:0};
  const [sourceId,rows]=[...candidates][0],home=rows.teams.filter(r=>canonicalTeam(r.team)===g.home),away=rows.teams.filter(r=>canonicalTeam(r.team)===g.away);
  const out={...base,sourceGameId:sourceId,playerRecords:rows.players.length,teamRecords:rows.teams.length};
  if(home.length!==1||away.length!==1)return {...out,state:'partial'};
  if(g.homeScore===null||g.awayScore===null)return {...out,state:'unknown-score'};
  if(home[0].points!==g.homeScore||away[0].points!==g.awayScore)return {...out,state:'score-conflict'};
  const homePlayers=rows.players.filter(r=>canonicalTeam(r.team)===g.home),awayPlayers=rows.players.filter(r=>canonicalTeam(r.team)===g.away);
  if(!homePlayers.length||!awayPlayers.length)return {...out,state:'partial'};
  if(homePlayers.reduce((n,r)=>n+r.points,0)!==g.homeScore||awayPlayers.reduce((n,r)=>n+r.points,0)!==g.awayScore)return {...out,state:'player-points-conflict'};
  return {...out,state:'compatible'};
 }).sort((a,b)=>b.day.localeCompare(a.day)||a.id.localeCompare(b.id));
 return {demo,latestPlayer,latestTeam,latestByEntity,finals,unresolved:finals.filter(g=>g.state!=='compatible').length,compatible:finals.filter(g=>g.state==='compatible').length};
}
export const COVERAGE_LABELS={missing:'Sin actuaciones localizadas',partial:'Registros parciales',ambiguous:'Correspondencia de partido sin confirmar','unknown-time':'Hora desconocida: correspondencia sin confirmar','unknown-score':'Marcador sin confirmar','score-conflict':'Marcador distinto del historial','player-points-conflict':'Los puntos individuales no suman el marcador',compatible:'Registros compatibles · sin verificar',demo:'Demostración: no contiene actuaciones reales'};
