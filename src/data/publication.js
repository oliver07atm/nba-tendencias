const https=value=>typeof value==='string'&&/^https:\/\/[^/\s]+\//.test(value);
export function assertSourceRights(config){
 if(!https(config.url)||!https(config.licenseUrl)||config.redistributionAllowed!==true)throw Error('La fuente necesita HTTPS, licencia y permiso de redistribución.');
 const rights=config.rights;
 if(rights?.status!=='verified'||!https(rights.originalSourcePermissionUrl)||typeof rights.reviewedAt!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(rights.reviewedAt)||!rights.scope?.includes('public-redistribution'))throw Error('Publicación bloqueada: falta documentar el permiso de la fuente original para redistribución pública. La licencia del repositorio no basta.');
}
export function assertPublishableDataset(data){
 if(data.meta.mode!=='real'||data.meta.origin==='historical-unverified'||data.meta.rights?.status!=='verified')throw Error('Publicación bloqueada: los datos no tienen derechos verificados o siguen sin verificar.');
 const comparisons=data.meta.accuracy?.comparisons;
 const required=['points','rebounds','assists','threeMade'];
 const games=new Set(Array.isArray(comparisons)?comparisons.filter(c=>c.matched===true&&c.gameId&&c.playerId&&/^\d{4}-\d{2}-\d{2}$/.test(c.checkedAt||'')&&https(c.sourceUrl)&&required.every(m=>c.metrics?.includes(m))).map(c=>c.gameId):[]);
 if(data.meta.accuracy?.status!=='verified'||games.size<2)throw Error('Publicación bloqueada: faltan comparaciones documentadas de P/R/A/triples en al menos dos partidos originales.');
}
