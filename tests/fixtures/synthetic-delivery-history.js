// Baseline of one older fictitious game, independent from the NEW game under test.
// Never exported to public/data or loaded by production code.
export function syntheticDeliveryHistory(packet){
 if(packet?.synthetic!==true||packet.games?.length!==1||packet.games[0].synthetic!==true)throw Error('Paquete ficticio requerido');
 const newRows=packet.games[0].records.filter(r=>r.kind==='player');
 if(newRows.length!==2||!newRows.every(r=>r.entity.startsWith('Jugador FICTICIO')))throw Error('Solo jugadores del fixture');
 const old=newRows.map((r,i)=>({...r,id:'fixture:game:880000:player:'+i,sourceGameKey:'fixture:game:880000',gameId:'880000',date:'2031-01-01T20:00:00Z',points:i===0?12:11,source:'FICTICIO · HISTORIAL ORIGINAL DE PRUEBA'}));
 const teams=old.map((r,i)=>({...r,id:'fixture:game:880000:team:'+r.team,kind:'team',entity:r.team,entityId:r.team,quarters:i===0?[3,3,3,3]:[3,3,3,2],opponentQuarters:i===0?[3,3,3,2]:[3,3,3,3],opponentStats:{...old[1-i]}}));
 return {meta:{mode:'imported',synthetic:true,source:'FICTICIO · SOLO PRUEBA INTEGRAL',origin:'historical-unverified',rights:{status:'unresolved'}},records:[...old,...teams],schedule:[]};
}
