// ENTIRELY FICTITIOUS VALUES, IDs, dates, teams' performances and player names.
// Field names follow the structure reported by the user from the first live probe.
import {nbaStatFixture} from './nbastat.js';
export function nbaStatWireFixture(){
 const {contract,mapping}=nbaStatFixture();
 const wire={data:{game:{id:990000001,game_date:'2031-01-02',scheduled:'2031-01-02T20:00:00Z',season:'2030-31',status:'FICTICIO_FINAL',home_team_id:99001,away_team_id:99002,home_score:20,away_score:15},players:contract.players.map(p=>{
  const s=p.stats||Object.fromEntries(['points','rebounds','assists','threeMade','threeAttempted','fieldMade','fieldAttempted','steals','blocks','turnovers','minutes'].map(k=>[k,0]));
  return {player_id:Number(p.sourceId),player_name:p.name,team_id:Number(p.teamId),team_name:'Equipo FICTICIO',points:s.points,assists:s.assists,rebounds_total:s.rebounds,rebounds_offensive:p.played?1:0,rebounds_defensive:p.played?3:0,three_pointers_made:s.threeMade,three_pointers_attempted:s.threeAttempted,field_goals_made:s.fieldMade,field_goals_attempted:s.fieldAttempted,free_throws_made:s.points-2*s.fieldMade-s.threeMade,free_throws_attempted:p.played?10:0,steals:s.steals,blocks:s.blocks,turnovers:s.turnovers,fouls_personal:0,minutes:p.played?'24:30':null,played:p.played?7:9,starter:0,status:p.played?'FICTICIO_JUGO':'FICTICIO_DNP',not_playing_reason:p.played?null:'FICTICIO_NO_JUGO',not_playing_description:null,plus_minus_points:0};
 })}};
 const review={status:'reviewed',gameFinal:true,complete:true,evidenceUrl:'https://nbastat.io/developers/api',checkedAt:'2031-01-03T00:00:00Z',sourceGameId:'990000001',observedGame:Object.fromEntries(['game_date','scheduled','season','status'].map(k=>[k,wire.data.game[k]])),date:'2031-01-02T20:00:00Z',season:'2030-31',competition:'NBA',minutesFormat:'mm:ss',dnpMinutes:[null],participation:[{played:7,status:'FICTICIO_JUGO',reason:null,description:null,participated:true},{played:9,status:'FICTICIO_DNP',reason:'FICTICIO_NO_JUGO',description:null,participated:false}]};
 return {wire,review,mapping,receivedAt:contract.receivedAt,synthetic:true};
}
