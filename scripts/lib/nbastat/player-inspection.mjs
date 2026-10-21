import {createNbaStatClient,NbaStatError} from './client.mjs';
import {sealProbe} from './sealed-probe.mjs';
import {ATTRIBUTION} from './probe.mjs';
// Schema discovery only. Never assume birth-date or external-ID field names.
export async function inspectPlayers({config,token,passphrase,confirmation,mode='profile',playerId='1548',teamId=null,page=1,store,fetchImpl,clock=()=>Date.now()}){
 if(confirmation!=='INSPECT_PLAYERS'||config.personalPermission!=='confirmed'||config.publicJsonPermission!=='confirmed'||config.season2026Coverage!=='confirmed'||config.permissionEvidence!=='user-reported-email')throw new NbaStatError('PROBE_NOT_CONFIRMED');
 if(typeof passphrase!=='string'||passphrase.length<32||passphrase===token)throw new NbaStatError('PRIVATE_PASSPHRASE_REQUIRED');
 if(!['profile','players-list'].includes(mode)||!Number.isSafeInteger(page)||page<1||mode==='profile'&&!/^[1-9]\d*$/.test(String(playerId))||teamId!==null&&!/^[1-9]\d*$/.test(String(teamId)))throw new NbaStatError('INVALID_DISCOVERY_QUERY');
 const client=createNbaStatClient({config:{...config,enabled:true,mode:'private-only'},purpose:'private-inspection',token,...store,fetchImpl,clock});
 const result=mode==='profile'?await client.player(playerId):await client.players({teamId,page});
 if(result.deferred)return {status:'deferred',notBefore:result.notBefore};
 const body=JSON.stringify(result.body);if(body.includes(token)||body.includes(passphrase))throw new NbaStatError('PRIVATE_RESPONSE_CONTAINS_CREDENTIAL');
 const request=mode==='profile'?{endpoint:'/api/v1/players/'+String(playerId),playerId:String(playerId)}:{endpoint:'/api/v1/players',page,perPage:100,teamId:teamId===null?null:String(teamId)};
 return {status:'sealed-review',sealed:sealProbe({purpose:'NBA Stat private player inspection; NOT approved for publication',receivedAt:new Date(clock()).toISOString(),attribution:ATTRIBUTION,request,raw:result.body,identityVerified:false},passphrase)};
}
