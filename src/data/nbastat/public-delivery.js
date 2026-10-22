// Public wire format: NBA Stat facts only. No canonical crosswalk, profile evidence or private state.
import {NBASTAT_ATTRIBUTION} from './provenance.js';
import {prepareNbaStatGame,applyNbaStatGame,emptyNbaStatUpdates,validateNbaStatMappings} from './updates.js';
export const DELIVERY_KIND='nba-tendencias-nbastat-public-v1';
export const PUBLIC_METRICS=['points','rebounds','assists','threeMade','threeAttempted','fieldMade','fieldAttempted','steals','blocks','turnovers','minutes'];
const codes=new Set('ATL BOS BKN CHA CHI CLE DAL DEN DET GSW HOU IND LAC LAL MEM MIA MIL MIN NOP NYK OKC ORL PHI PHX POR SAC SAS TOR UTA WAS'.split(' '));
const id=v=>typeof v==='string'&&/^[1-9]\d*$/.test(v);
const iso=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(v)&&Number.isFinite(Date.parse(v));
const count=v=>Number.isSafeInteger(v)&&v>=0;
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
function keys(v,allowed){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join('|')!==[...allowed].sort().join('|'))throw Error('PUBLIC_DELIVERY_FIELDS_INVALID');}
export const encodePublicJson=value=>JSON.stringify(value)+'\n';
export async function publicDigest(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(encodePublicJson(value)));return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');}
function mode(value,testMode){if(typeof value!=='boolean'||value&&testMode!==true)throw Error('SYNTHETIC_PUBLIC_DELIVERY_FORBIDDEN');}
export function validatePublicManifest(m,{testMode=false}={}){
 keys(m,['version','kind','source','attribution','synthetic','generation','publishedAt','mode','games','withdrawnSourceIds']);mode(m.synthetic,testMode);
 if(m.version!==1||m.kind!==DELIVERY_KIND||m.source!=='NBA Stat'||m.attribution!==NBASTAT_ATTRIBUTION||!Number.isSafeInteger(m.generation)||m.generation<1||!iso(m.publishedAt)||!['update','rollback'].includes(m.mode)||!Array.isArray(m.games)||m.games.length>5000||!Array.isArray(m.withdrawnSourceIds)||m.withdrawnSourceIds.some(x=>!id(x))||new Set(m.withdrawnSourceIds).size!==m.withdrawnSourceIds.length)throw Error('PUBLIC_MANIFEST_INVALID');
 const used=new Set();for(const d of m.games){keys(d,['sourceGameId','sha256']);if(!id(d.sourceGameId)||!hash(d.sha256)||used.has(d.sourceGameId)||m.withdrawnSourceIds.includes(d.sourceGameId))throw Error('PUBLIC_GAME_INDEX_INVALID');used.add(d.sourceGameId);}return m;
}
export function validatePublicGame(p,{testMode=false}={}){
 keys(p,['version','source','synthetic','sourceGameId','revisionAt','game','players','absentSourceIds']);mode(p.synthetic,testMode);
 if(p.version!==1||p.source!=='NBA Stat'||!id(p.sourceGameId)||!iso(p.revisionAt)||!Array.isArray(p.players)||!p.players.length||p.players.length>100||!Array.isArray(p.absentSourceIds)||p.absentSourceIds.length>100)throw Error('PUBLIC_GAME_INVALID');
 const g=p.game;keys(g,['date','season','competition','home','away','homeId','awayId','homeScore','awayScore']);
 if(!iso(g.date)||!/^\d{4}-\d{2}$/.test(g.season)||!['NBA','NBA Cup','Playoffs','Play-in','Pretemporada'].includes(g.competition)||!codes.has(g.home)||!codes.has(g.away)||g.home===g.away||!id(g.homeId)||!id(g.awayId)||g.homeId===g.awayId||!count(g.homeScore)||!count(g.awayScore))throw Error('PUBLIC_MATCHUP_INVALID');
 const used=new Set(),totals=new Map([[g.homeId,0],[g.awayId,0]]);
 for(const r of p.players){keys(r,['sourceId','name','teamId',...PUBLIC_METRICS]);if(!id(r.sourceId)||used.has(r.sourceId)||!totals.has(r.teamId)||typeof r.name!=='string'||!r.name.trim()||r.name.length>150||! /^[\p{L}\p{M} .’'\-]+$/u.test(r.name)||PUBLIC_METRICS.some(k=>k==='minutes'?typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0:!count(r[k]))||r.threeMade>r.fieldMade||r.fieldMade>r.fieldAttempted||r.threeMade>r.threeAttempted||r.threeAttempted>r.fieldAttempted||r.points<2*r.fieldMade+r.threeMade)throw Error('PUBLIC_PLAYER_INVALID');used.add(r.sourceId);totals.set(r.teamId,totals.get(r.teamId)+r.points);}
 for(const sourceId of p.absentSourceIds){if(!id(sourceId)||used.has(sourceId))throw Error('PUBLIC_ABSENCE_INVALID');used.add(sourceId);}
 if(totals.get(g.homeId)!==g.homeScore||totals.get(g.awayId)!==g.awayScore)throw Error('PUBLIC_SCORE_TOTAL_MISMATCH');return p;
}
export async function validatePublicRelease(release,options={}){
 keys(release,['manifest','games','sha256']);const m=validatePublicManifest(release.manifest,options);if(await publicDigest(m)!==release.sha256||!release.games||Array.isArray(release.games)||Object.keys(release.games).length!==m.games.length)throw Error('PUBLIC_RELEASE_INCOMPLETE');
 for(const d of m.games){const p=validatePublicGame(release.games[d.sourceGameId],options);if(p.synthetic!==m.synthetic||p.sourceGameId!==d.sourceGameId||await publicDigest(p)!==d.sha256)throw Error('PUBLIC_GAME_CHECKSUM_MISMATCH');}return release;
}
export function checkPublicAdvance(previous,next){
 if(!previous)return;
 if(next.generation<previous.generation)throw Error('PUBLIC_RELEASE_STALE');
 for(const d of previous.games)if(!next.games.some(n=>n.sourceGameId===d.sourceGameId)&&!next.withdrawnSourceIds.includes(d.sourceGameId))throw Error('PUBLIC_RELEASE_UNDECLARED_REMOVAL');
}
// Local mappings resolve native IDs. Nothing from mappings is sent back to the publisher.
export function publicDeliveryView(privateUpdates,release,mappings,{testMode=false}={}){
 validateNbaStatMappings(mappings);let updates=structuredClone(privateUpdates);const pending=[],conflicts=[],changes=[];
 if(!release)return {updates,pending,conflicts,changes};validatePublicManifest(release.manifest,{testMode});
 for(const id of release.manifest.withdrawnSourceIds){const key='nbastat:game:'+id;if(updates.games[key]){delete updates.games[key];conflicts.push({sourceGame:key,reason:'PUBLIC_SOURCE_WITHDRAWN_PRIVATE_COPY_RETAINED'});}}
 for(const d of release.manifest.games){const p=validatePublicGame(release.games[d.sourceGameId],{testMode}),g=p.game,key='nbastat:game:'+p.sourceGameId,old=updates.games[key];
 try{
  if(mappings.teams.some(t=>t.sourceId===g.homeId&&t.team!==g.home||t.sourceId===g.awayId&&t.team!==g.away))throw Error('LOCAL_TEAM_MAPPING_CONFLICT');
  const teams=[[g.homeId,g.home],[g.awayId,g.away]].map(([sourceId,team])=>({sourceId,team,checkedAt:p.revisionAt,sourceUrl:'https://nbastat.io/api/v1/teams/'+sourceId}));
  const players=p.players.map(r=>({sourceId:r.sourceId,name:r.name,teamId:r.teamId,played:true,stats:Object.fromEntries(PUBLIC_METRICS.map(k=>[k,r[k]]))}));
  const batch=prepareNbaStatGame({contract:'nba-tendencias-boxscore-v1',synthetic:p.synthetic,complete:true,sourceGameId:p.sourceGameId,receivedAt:p.revisionAt,game:{...g,status:'final'},players},{version:1,teams,players:mappings.players},{allowPartialIdentities:true});
  const linked=new Set(mappings.players.map(x=>x.sourceId));pending.push(...p.players.filter(r=>!linked.has(r.sourceId)).map(r=>({sourceGame:key,sourceId:r.sourceId})));
  if(!batch.ready){if(old&&Date.parse(p.revisionAt)>=Date.parse(old.receivedAt)&&old.records.some(r=>p.absentSourceIds.includes(r.id.split(':').at(-1)))){delete updates.games[key];conflicts.push({sourceGame:key,reason:'PUBLIC_CORRECTION_RETRACTED_PARTICIPATION'});}continue;}
  batch.dnp=p.absentSourceIds.map(sourceId=>old?.dnp.find(x=>x.sourceId===sourceId)||{sourceId,reason:'Ausencia comunicada por NBA Stat'});
  const applied=applyNbaStatGame(updates,batch);updates=applied.state;changes.push({sourceGame:key,reason:applied.reason});
 }catch(e){conflicts.push({sourceGame:key,reason:e.message});}
 }
 return {updates,pending,conflicts,changes};
}
