// ENTIRELY FICTITIOUS. Never copied to public/data or shipped by the app.
import {nbaStatFixture} from './nbastat.js';
import {DELIVERY_KIND,publicDigest} from '../../src/data/nbastat/public-delivery.js';
import {NBASTAT_ATTRIBUTION} from '../../src/data/nbastat/provenance.js';
export async function publicReleaseFixture({generation=1,points=20,revisionAt='2031-01-03T01:00:00Z'}={}){
 const f=nbaStatFixture(),c=f.contract;
 const packet={version:1,source:'NBA Stat',synthetic:true,sourceGameId:c.sourceGameId,revisionAt,game:{...Object.fromEntries(['date','season','competition','homeId','awayId','homeScore','awayScore'].map(k=>[k,c.game[k]])),home:'BOS',away:'DET',homeScore:points},players:c.players.filter(p=>p.played).map((p,i)=>({sourceId:p.sourceId,name:p.name,teamId:p.teamId,...p.stats,points:i===0?points:p.stats.points,minutes:24.5})),absentSourceIds:c.players.filter(p=>!p.played).map(p=>p.sourceId)};
 const manifest={version:1,kind:DELIVERY_KIND,source:'NBA Stat',attribution:NBASTAT_ATTRIBUTION,synthetic:true,generation,publishedAt:revisionAt,mode:'update',games:[{sourceGameId:packet.sourceGameId,sha256:await publicDigest(packet)}],withdrawnSourceIds:[]};return {release:{manifest,games:{[packet.sourceGameId]:packet},sha256:await publicDigest(manifest)},mappings:f.mapping};
}
