import {randomBytes,scryptSync,createCipheriv,createDecipheriv} from 'node:crypto';
import {createNbaStatClient,decodeNbaStatResponse,NbaStatError} from './client.mjs';
import {ATTRIBUTION} from './probe.mjs';
import {nbaStatIdentityChecklist} from './decoder.mjs';
export function sealProbe(payload,passphrase){
 if(typeof passphrase!=='string'||passphrase.length<32)throw new NbaStatError('PRIVATE_PASSPHRASE_REQUIRED');
 const salt=randomBytes(16),iv=randomBytes(12),key=scryptSync(passphrase,salt,32),cipher=createCipheriv('aes-256-gcm',key,iv);
 const ciphertext=Buffer.concat([cipher.update(JSON.stringify(payload),'utf8'),cipher.final()]);key.fill(0);
 return {version:1,kdf:'scrypt-N16384-r8-p1',cipher:'aes-256-gcm',salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
}
export function openProbe(envelope,passphrase){
 if(envelope?.version!==1||envelope.kdf!=='scrypt-N16384-r8-p1'||envelope.cipher!=='aes-256-gcm'||typeof passphrase!=='string'||passphrase.length<32)throw new NbaStatError('PRIVATE_PACKAGE_INVALID');
 try{const key=scryptSync(passphrase,Buffer.from(envelope.salt,'base64'),32),d=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));d.setAuthTag(Buffer.from(envelope.tag,'base64'));try{return JSON.parse(Buffer.concat([d.update(Buffer.from(envelope.ciphertext,'base64')),d.final()]).toString('utf8'));}finally{key.fill(0);}}catch{throw new NbaStatError('PRIVATE_PACKAGE_AUTH_FAILED');}
}
export async function runSealedProbe({config,token,passphrase,confirmation,store,fetchImpl,clock=()=>Date.now()}){
 if(confirmation!=='VALIDATE_1369'||config.personalPermission!=='confirmed'||config.publicJsonPermission!=='confirmed'||config.season2026Coverage!=='confirmed'||config.permissionEvidence!=='user-reported-email')throw new NbaStatError('PROBE_NOT_CONFIRMED');
 if(typeof passphrase!=='string'||passphrase.length<32||passphrase===token)throw new NbaStatError('PRIVATE_PASSPHRASE_REQUIRED');
 const client=createNbaStatClient({config:{...config,enabled:true,mode:'private-only'},purpose:'private-inspection',token,...store,fetchImpl,clock});
 const result=await client.boxScore('1369');if(result.deferred)return {status:'deferred',notBefore:result.notBefore};
 const text=JSON.stringify(result.body);if(text.includes(token)||text.includes(passphrase))throw new NbaStatError('PRIVATE_RESPONSE_CONTAINS_CREDENTIAL');
 const receivedAt=new Date(clock()).toISOString();
 let decoded=null,decoderError=null;
 try{decoded=decodeNbaStatResponse(result.body);}catch(e){decoderError=e instanceof NbaStatError?e.code:'DECODING_FAILED';}
 // A malformed response is retained ONLY inside authenticated encryption, never logged.
 const sealed=sealProbe({purpose:'NBA Stat private review; NOT approved for publication',receivedAt,attribution:ATTRIBUTION,providerReportedReference:{gameId:'1369',date:'2026-10-20',home:'Detroit Pistons',away:'Boston Celtics',homeScore:121,awayScore:113,records:35},raw:result.body,decoded,decoderError,referenceChecks:decoded?{internalGameIdMatches:decoded.game.sourceGameId==='1369',scoreMatches:decoded.game.homeScore===121&&decoded.game.awayScore===113,recordCountMatches:decoded.diagnostics.recordCount===35,teamsVerified:false,dateVerified:false,participationVerified:false,identitiesVerified:false}:null,identityMappings:{version:1,players:[],teams:[]},identityChecklist:decoded?nbaStatIdentityChecklist(decoded):null},passphrase);
 return {status:'sealed-review',sealed};
}
