// Offline evidence boundary. Never resolves player identities or initiates HTTP.
import {readPrivateReview,rejectCredentials} from './import.js';
import {validateSchedule} from '../schedule.js';
import {exactTeamName} from '../nba-teams.js';
const codes=new Set('ATL BOS BKN CHA CHI CLE DAL DEN DET GSW HOU IND LAC LAL MEM MIA MIL MIN NOP NYK OKC ORL PHI PHX POR SAC SAS TOR UTA WAS'.split(' '));
const ref=v=>typeof v==='string'&&v.trim().length>=12&&v.length<=500&&!/[\r\n]/.test(v)&&!/(?:token|api_key|password)=/i.test(v);
const instant=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const calendarDay=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\d$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
// Exact franchise labels observed in the original rows; never infer NBA Stat IDs from BDL IDs.
export function observedTeamEvidence(file){
 const {parsed}=readPrivateReview(file);
 const teams=[parsed.game.homeId,parsed.game.awayId].map((sourceId,i)=>{
  const rows=parsed.players.filter(p=>p.teamId===sourceId),names=[...new Set(rows.map(p=>p.source.team_name))];
  const matched=names.map(exactTeamName),code=matched.length&&matched.every(c=>c&&c===matched[0])?matched[0]:null;
  return {sourceId,role:i?'away':'home',rows:rows.length,names,code:rows.length?code:null,reference:'private-review:data.players.team_id+team_name'};
 });
 // Distinct native IDs cannot both establish the same home/away franchise.
 if(teams[0].code&&teams[0].code===teams[1].code)for(const team of teams)team.code=null;
 return teams;
}
export function inspectGameLink(file,calendar,evidence){
 const {parsed,receivedAt}=readPrivateReview(file);validateSchedule(calendar);rejectCredentials(evidence);
 const result=inspectGameReference({...parsed.game,...parsed.observed.game},{calendar,evidence,receivedAt,synthetic:file.synthetic===true,consistent:!parsed.diagnostics.issues.length&&parsed.diagnostics.pointTotalsMatch===true});
 if(evidence?.teamMethod==='source-row-consensus'){
  const observed=observedTeamEvidence(file);
  if(observed.some(t=>!t.code||!evidence.teams?.some(e=>String(e.sourceId)===t.sourceId&&e.code===t.code))){result.reasons.push('SOURCE_TEAM_ROWS_UNRESOLVED');result.status='pending';}
 }
 return result;
}
export function inspectGameReference(source,{calendar,evidence,receivedAt,synthetic=false,consistent=true}){
 validateSchedule(calendar);rejectCredentials(evidence);rejectCredentials(source);
 const g=source,o=source,reasons=[];
 if(!/^[1-9]\d*$/.test(g.sourceGameId||'')||![g.homeId,g.awayId].every(v=>typeof v==='string'&&/^[1-9]\d*$/.test(v))||g.homeId===g.awayId||![g.homeScore,g.awayScore].every(v=>Number.isSafeInteger(v)&&v>=0))throw Error('Referencia de partido incompleta o inválida.');
 const teams=evidence?.teams||[];
 const team=id=>{const found=teams.filter(t=>String(t.sourceId)===id&&codes.has(t.code)&&ref(t.reference));return found.length===1?found[0].code:null;};
 const home=team(g.homeId),away=team(g.awayId);
 if(!home||!away||home===away)reasons.push('TEAM_EVIDENCE_MISSING');
 if(evidence?.version!==1||!ref(evidence?.provenanceReference)||!ref(evidence?.semanticsReference))reasons.push('INDEPENDENT_PROVENANCE_OR_SEMANTICS_MISSING');
 // Meaning of these literal values must have been reviewed from NBA Stat, not copied from BDL.
 if(!evidence||evidence.finalStatus!==o.status||evidence.seasonValue!==o.season||!Number.isInteger(evidence.seasonYear)||evidence.competition!=='NBA')reasons.push('STATUS_OR_SEASON_UNVERIFIED');
 const dateOnly=evidence?.dateMethod==='declared-date';
 if(dateOnly){if(!calendarDay(o.game_date)||evidence.dateSemanticsConfirmed!==true)reasons.push('SOURCE_DECLARED_DATE_UNVERIFIED');}
 else if(!instant(o.scheduled))reasons.push('SOURCE_TIMEZONE_UNRESOLVED');
 if(!consistent)reasons.push('BOXSCORE_INCONSISTENT');
 // Uniqueness is checked before scores: conflicting scores must not select a convenient duplicate.
 const pairing=calendar.games.filter(c=>c.home===home&&c.away===away&&c.season===evidence?.seasonYear&&c.competition==='NBA'&&(dateOnly?calendarDay(o.game_date)&&c.sourceDate===o.game_date:instant(c.date)&&instant(o.scheduled)&&Date.parse(c.date)===Date.parse(o.scheduled)));
 if(dateOnly&&calendar.games.some(c=>c.home===home&&c.away===away&&c.season===evidence?.seasonYear&&!calendarDay(c.sourceDate)))reasons.push('CALENDAR_DECLARED_DATE_MISSING');
 if(dateOnly&&pairing.length>1)reasons.push('AMBIGUOUS_DECLARED_DATE');
 const candidates=pairing.filter(c=>c.homeScore===g.homeScore&&c.awayScore===g.awayScore&&c.status==='final'&&instant(c.date));
 if(candidates.length!==1)reasons.push(candidates.length?'AMBIGUOUS_CALENDAR_MATCH':'NO_EXACT_CALENDAR_MATCH');
 return {version:1,status:reasons.length?'pending':'eligible',reasons,sourceId:g.sourceGameId,receivedAt,synthetic,source:{...g,...o},candidates:candidates.map(c=>({...c})),evidence:evidence?structuredClone(evidence):null};
}
export function approveGameLink(result,{confirmed=false,checkedAt=new Date().toISOString()}={}){
 if(!confirmed||result.status!=='eligible'||result.reasons.length||result.candidates.length!==1||!instant(checkedAt))throw Error('Evidencias insuficientes: el enlace sigue pendiente.');
 return {version:1,status:'locally-reviewed',checkedAt,synthetic:result.synthetic,sourceId:result.sourceId,source:result.source,receivedAt:result.receivedAt,evidence:result.evidence,calendar:result.candidates[0]};
}
// Re-evaluate exports against both source facts and the current calendar; status alone is never trusted.
export function validateGameLink(link,calendar){
 rejectCredentials(link);
 if(link?.version!==1||link.status!=='locally-reviewed'||!instant(link.checkedAt)||!ref(link.evidence?.provenanceReference)||!ref(link.evidence?.semanticsReference)||!link.source||link.source.sourceGameId!==link.sourceId)throw Error('Registro de enlace inválido.');
 validateSchedule(calendar);
 const result=inspectGameReference(link.source,{calendar,evidence:link.evidence,receivedAt:link.receivedAt,synthetic:link.synthetic});
 const c=result.candidates[0];
 if(result.status!=='eligible'||!c||['id','home','away','date','sourceDate','homeScore','awayScore','season','status','competition'].some(k=>c[k]!==link.calendar[k]))throw Error('El calendario o las evidencias han cambiado: revisar de nuevo.');
 return link;
}
export function mergeGameLinks(existing,incoming,calendar){
 const out=structuredClone(existing);
 for(const link of incoming){validateGameLink(link,calendar);const conflict=out.find(l=>(l.sourceId===link.sourceId)!==(l.calendar.id===link.calendar.id));if(conflict)throw Error('Correspondencia contradictoria: IDs no unívocos.');const i=out.findIndex(l=>l.calendar.id===link.calendar.id);if(i>=0&&Date.parse(out[i].checkedAt)>Date.parse(link.checkedAt))throw Error('Revisión antigua.');if(i>=0)out[i]=structuredClone(link);else out.push(structuredClone(link));}return out;
}
export function queueGameLink(link,calendar,{testMode=false}={}){validateGameLink(link,calendar);if(link.synthetic&&!testMode)throw Error('Enlace ficticio excluido de la cola real.');const c=link.calendar;return {calendarId:c.id,sourceId:link.sourceId,status:'reviewed',checkedAt:link.checkedAt,date:c.date,home:c.home,away:c.away,season:c.season+'-'+String(c.season+1).slice(-2),competition:c.competition,evidenceUrl:'https://nbastat.io/api/v1/games/'+link.sourceId+'/boxscore'};}
// Offline batches reuse reviewed provider semantics/team evidence; no name-based matching.
// Eligibility is a proposal, never an approval. One-to-one checks include the whole batch.
export function inspectGameLinkBatch(files,calendar,evidence){
 const results=files.map(file=>inspectGameLink(file,calendar,evidence));
 for(const r of results){if(results.filter(x=>x.sourceId===r.sourceId).length>1||r.candidates.length===1&&results.filter(x=>x.candidates.some(c=>c.id===r.candidates[0].id)).length>1){r.reasons.push('BATCH_ID_CONFLICT');r.status='pending';}}
 return results;
}

// Provider index schema is explicit and locally reviewed; field names are never guessed.
export function inspectGameReferenceBatch(sources,options){
 const results=sources.map(source=>inspectGameReference(source,options));
 for(const r of results)if(results.filter(x=>x.sourceId===r.sourceId).length>1||r.candidates.length===1&&results.filter(x=>x.candidates.some(c=>c.id===r.candidates[0].id)).length>1){r.status='pending';r.reasons.push('BATCH_ID_CONFLICT');}
 return results;
}
export async function referencesFromGameIndex(packet,schema){
 rejectCredentials(packet);rejectCredentials(schema);
 if(packet?.purpose!=='NBA Stat private game index; NOT approved for publication'||!packet.raw)throw Error('Se necesita un índice privado con procedencia revisada.');
 const {observedProfileField}=await import('./identity-evidence.js');
 const rows=observedProfileField(packet.raw,schema.rowsPath);
 if(!Array.isArray(rows)||rows.length>5000)throw Error('Índice de partidos inválido.');
 const fields=['sourceGameId','homeId','awayId','homeScore','awayScore','game_date','scheduled','season','status'];
 return rows.map(row=>Object.fromEntries(fields.map(k=>{let v=observedProfileField(row,schema[k]);if(['sourceGameId','homeId','awayId'].includes(k)&&Number.isSafeInteger(v)&&v>0)v=String(v);return [k,v];})));
}
