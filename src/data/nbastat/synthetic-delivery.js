// TEST CONTRACT ONLY. No fetching, storage or production activation.
import {emptyNbaStatUpdates,applyNbaStatGame} from './updates.js';
import {rejectCredentials} from './import.js';
import {NBASTAT_ATTRIBUTION} from './provenance.js';
const kind='nba-tendencias-synthetic-delivery-v1';
function checked(batch){
 rejectCredentials(batch);
 if(batch?.ready!==true||batch.synthetic!==true||batch.pendingIdentities?.length||batch.publicRedistributionAllowed!==false||batch.records?.some(r=>!String(r.source).includes('DEMOSTRACIÓN FICTICIA')))throw Error('Solo lotes ficticios completos y validados para pruebas');
 applyNbaStatGame(emptyNbaStatUpdates(),batch);return structuredClone(batch);
}
export function makeSyntheticDelivery(updates){
 if(updates?.version!==1||updates.source!=='NBA Stat'||!updates.games||Array.isArray(updates.games))throw Error('Capa de prueba inválida');
 const games=Object.values(updates.games).map(checked).sort((a,b)=>a.sourceGame.localeCompare(b.sourceGame));
 return {version:1,kind,synthetic:true,warning:'FICTICIO · SOLO PRUEBAS · NO PUBLICAR EN PRODUCCIÓN',attribution:NBASTAT_ATTRIBUTION,games};
}
export function acceptSyntheticDelivery(current,packet,{testMode=false}={}){
 if(testMode!==true)throw Error('Entrega ficticia desactivada fuera de las pruebas');
 rejectCredentials(packet);
 if(packet?.version!==1||packet.kind!==kind||packet.synthetic!==true||packet.warning!=='FICTICIO · SOLO PRUEBAS · NO PUBLICAR EN PRODUCCIÓN'||packet.attribution!==NBASTAT_ATTRIBUTION||!Array.isArray(packet.games)||packet.games.length>100||Object.keys(packet).some(k=>!['version','kind','synthetic','warning','attribution','games'].includes(k)))throw Error('Paquete de entrega ficticia inválido');
 if(current?.version!==1||current.source!=='NBA Stat'||!current.games||Object.values(current.games).some(b=>b.synthetic!==true))throw Error('No se mezclan pruebas con actualizaciones reales');
 const seen=new Set(),changes=[];let next=structuredClone(current);
 for(const batch of packet.games){const valid=checked(batch);if(seen.has(valid.sourceGame))throw Error('Partido repetido en la entrega');seen.add(valid.sourceGame);const result=applyNbaStatGame(next,valid);next=result.state;changes.push({sourceGame:valid.sourceGame,reason:result.reason});}
 return {updates:next,changes};
}
