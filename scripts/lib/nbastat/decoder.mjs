// Server-only wire decoder. Confirmed field names, NOT confirmed value semantics.
import {NbaStatError} from './client.mjs';
const metrics={points:'points',rebounds:'rebounds_total',assists:'assists',threeMade:'three_pointers_made',threeAttempted:'three_pointers_attempted',fieldMade:'field_goals_made',fieldAttempted:'field_goals_attempted',steals:'steals',blocks:'blocks',turnovers:'turnovers'};
const extras=['rebounds_offensive','rebounds_defensive','free_throws_made','free_throws_attempted','fouls_personal'];
const fail=code=>{throw new NbaStatError(code);};
const id=v=>{if(!(typeof v==='string'&&/^[1-9]\d*$/.test(v)||typeof v==='number'&&Number.isSafeInteger(v)&&v>0))fail('WIRE_ID_INVALID');return String(v);};
const count=v=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
const scalar=v=>v===null||['string','number','boolean'].includes(typeof v)&&!(typeof v==='number'&&!Number.isFinite(v));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function decodeNbaStatResponse(body,{review=null,receivedAt=null,synthetic=false}={}){
 if(!body)fail('WIRE_SCHEMA_UNVERIFIED');
 if(typeof window!=='undefined')fail('SERVER_ONLY');
 const g=body?.data?.game,rows=body?.data?.players;
 if(!g||!Array.isArray(rows)||!rows.length)fail('WIRE_ENVELOPE_INVALID');
 const game={sourceGameId:id(g.id),homeId:id(g.home_team_id),awayId:id(g.away_team_id),homeScore:g.home_score,awayScore:g.away_score};
 if(game.homeId===game.awayId||![game.homeScore,game.awayScore].every(count))fail('WIRE_GAME_INVALID');
 for(const k of ['game_date','scheduled','season','status'])if(!Object.hasOwn(g,k)||!scalar(g[k]))fail('WIRE_GAME_FIELDS_INVALID');
 const used=new Set(),issues=[];
 const players=rows.map(p=>{
  const sourceId=id(p.player_id),teamId=id(p.team_id);
  if(used.has(sourceId)||![game.homeId,game.awayId].includes(teamId))fail('WIRE_DUPLICATE_OR_TEAM');used.add(sourceId);
  if(typeof p.player_name!=='string'||!p.player_name.trim()||typeof p.team_name!=='string'||typeof p.played!=='number'||!Number.isFinite(p.played)||!(p.minutes===null||typeof p.minutes==='string')||![p.not_playing_reason,p.not_playing_description].every(v=>v===null||typeof v==='string')||!Object.hasOwn(p,'status')||!scalar(p.status)||!Object.hasOwn(p,'starter')||!scalar(p.starter))fail('WIRE_PLAYER_FIELDS_INVALID');
  const s=Object.fromEntries(Object.entries(metrics).map(([key,wire])=>{if(!(p[wire]===null||count(p[wire])))fail('WIRE_STAT_INVALID');return [key,p[wire]];}));
  for(const k of extras)if(!(p[k]===null||count(p[k])))fail('WIRE_STAT_INVALID');
  if(!(p.plus_minus_points===null||typeof p.plus_minus_points==='number'&&Number.isFinite(p.plus_minus_points)))fail('WIRE_STAT_INVALID');
  // Preserve source values. No null-to-zero, truthiness-based participation or guessed units.
  if([...Object.values(s),...extras.map(k=>p[k])].every(v=>v!==null)){
   if(p.three_pointers_made>p.field_goals_made||p.field_goals_made>p.field_goals_attempted||p.three_pointers_made>p.three_pointers_attempted||p.three_pointers_attempted>p.field_goals_attempted||p.free_throws_made>p.free_throws_attempted||p.points!==2*p.field_goals_made+p.three_pointers_made+p.free_throws_made||p.rebounds_total!==p.rebounds_offensive+p.rebounds_defensive)issues.push({sourceId,code:'STAT_ARITHMETIC'});
  }
  return {sourceId,name:p.player_name,teamId,stats:s,observed:{played:p.played,minutes:p.minutes,status:p.status,starter:p.starter,reason:p.not_playing_reason,description:p.not_playing_description},source:structuredClone(p)};
 });
 for(const teamId of [game.homeId,game.awayId]){
  const teamRows=players.filter(p=>p.teamId===teamId);
  if(teamRows.every(p=>p.stats.assists!==null&&p.stats.fieldMade!==null)&&teamRows.reduce((n,p)=>n+p.stats.assists,0)>teamRows.reduce((n,p)=>n+p.stats.fieldMade,0))issues.push({teamId,code:'TEAM_ASSISTS_EXCEED_FIELD_GOALS'});
 }
 const observed={game:Object.fromEntries(['game_date','scheduled','season','status'].map(k=>[k,g[k]])),participation:[...new Set(players.map(p=>p.observed.played))],minutes:[...new Set(players.map(p=>p.observed.minutes))],statuses:[...new Set(players.map(p=>p.observed.status))]};
 const totals={home:players.filter(p=>p.teamId===game.homeId).reduce((sum,p)=>p.stats.points===null?NaN:sum+p.stats.points,0),away:players.filter(p=>p.teamId===game.awayId).reduce((sum,p)=>p.stats.points===null?NaN:sum+p.stats.points,0)};
 const diagnostics={recordCount:players.length,issues,pointTotalsMatch:Number.isFinite(totals.home)&&Number.isFinite(totals.away)?totals.home===game.homeScore&&totals.away===game.awayScore:null,teamBoxScoreAvailable:false,quartersAvailable:false,percentagesInterpreted:false};
 const parsed={ready:false,reason:'VALUE_SEMANTICS_UNVERIFIED',game,players,observed,diagnostics};
 if(!review)return parsed;
 if(review.status!=='reviewed'||review.gameFinal!==true||review.complete!==true||!/^https:\/\/nbastat.io\//.test(review.evidenceUrl||'')||!/^\d{4}-\d{2}-\d{2}T.*Z$/.test(review.checkedAt||'')||!Number.isFinite(Date.parse(review.checkedAt))||review.sourceGameId!==game.sourceGameId||!same(review.observedGame,observed.game)||!['decimal-string','mm:ss'].includes(review.minutesFormat)||!Array.isArray(review.participation)||!Array.isArray(review.dnpMinutes)||!/^\d{4}-\d{2}$/.test(review.season||'')||!['NBA','NBA Cup','Playoffs','Play-in','Pretemporada'].includes(review.competition)||!/^\d{4}-\d{2}-\d{2}T.*Z$/.test(review.date||'')||!Number.isFinite(Date.parse(review.date))||!/^\d{4}-\d{2}-\d{2}T.*Z$/.test(receivedAt||'')||!Number.isFinite(Date.parse(receivedAt)))fail('SEMANTICS_REVIEW_INVALID');
 // Per-game explicit review pins the exact source date/season/final status; no generic date parser guessed.
 if(new Set(review.participation.map(p=>JSON.stringify([p.played,p.status,p.reason,p.description]))).size!==review.participation.length)fail('SEMANTICS_REVIEW_INVALID');
 const converted=players.map(p=>{
  const r=review.participation.find(r=>same([r.played,r.status,r.reason,r.description],[p.observed.played,p.observed.status,p.observed.reason,p.observed.description]));
  if(!r||typeof r.participated!=='boolean')return {...p,played:null};
  const value=p.observed.minutes;
  let minutes=null;
  if(value!==null){
   if(review.minutesFormat==='decimal-string'&&/^\d+(?:\.\d+)?$/.test(value))minutes=Number(value);
   if(review.minutesFormat==='mm:ss'&&/^\d+:[0-5]\d$/.test(value)){const [m,s]=value.split(':').map(Number);minutes=m+s/60;}
  }
  if(r.participated&&(minutes===null||!Number.isFinite(minutes)||Object.values(p.stats).some(v=>v===null)||extras.some(k=>p.source[k]===null)))return {...p,played:null};
  if(!r.participated&&(minutes!==null&&minutes>0||Object.values(p.stats).some(v=>v!==null&&v!==0)||extras.some(k=>p.source[k]!==null&&p.source[k]!==0)||p.source.plus_minus_points!==null&&p.source.plus_minus_points!==0))fail('DNP_STATS_CONTRADICTION');
  if(!r.participated&&!review.dnpMinutes.some(v=>same(v,value)))return {...p,played:null};
  return {sourceId:p.sourceId,name:p.name,teamId:p.teamId,played:r.participated,reason:p.observed.reason??p.observed.description??'DNP revisado',stats:r.participated?{...p.stats,minutes}:undefined};
 });
 const pending=converted.filter(p=>p.played===null).map(p=>p.sourceId);
 if(pending.length)return {...parsed,reason:'PARTICIPATION_OR_MINUTES_PENDING',pending};
 if(issues.length||diagnostics.pointTotalsMatch===false)fail('BOX_SCORE_ARITHMETIC');
 return {ready:true,diagnostics,contract:{contract:'nba-tendencias-boxscore-v1',sourceGameId:game.sourceGameId,receivedAt,synthetic,complete:true,game:{homeId:game.homeId,awayId:game.awayId,homeScore:game.homeScore,awayScore:game.awayScore,date:review.date,season:review.season,status:'final',competition:review.competition},players:converted}};
}

// Candidate list only; zero auto-links, no name-based joins or fabricated birth dates.
export function nbaStatIdentityChecklist(decoded){
 if(!decoded?.players||!decoded?.game)fail('WIRE_ENVELOPE_INVALID');
 return {version:1,sourceGameId:decoded.game.sourceGameId,teams:[decoded.game.homeId,decoded.game.awayId].map(sourceId=>({sourceId,status:'pending',sourceUrl:'https://nbastat.io/api/v1/teams/'+sourceId})),players:decoded.players.map(p=>({sourceId:p.sourceId,reportedName:p.name,status:'pending',sourceUrl:'https://nbastat.io/api/v1/players/'+p.sourceId,requiredEvidence:['canonical NBA/ESPN ID and profile','source and canonical dates of birth','review date'],historicalAvailability:'not-assessed'}))};
}
