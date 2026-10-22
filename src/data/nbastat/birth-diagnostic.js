// Read-only counts from the canonical catalog actually assembled in this browser.
// birthDate is supplied only by the existing reviewed NBA/ESPN identity context.
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export function catalogBirthDiagnostic(catalog,{rosterKeys=new Set()}={}){
 const seen=new Set();
 const players=catalog.map(p=>{if(seen.has(p.key))throw Error('Catálogo duplicado: resuelve los alias antes del diagnóstico.');seen.add(p.key);return {key:p.key,name:p.names[0]||p.key,inImportedRoster:rosterKeys.has(p.key),state:validDate(p.birthDate)?'verified-local':'missing-verified-date',invalidDate:p.birthDate!=null&&!validDate(p.birthDate)};});
 const count=rows=>({total:rows.length,verified:rows.filter(p=>p.state==='verified-local').length,missing:rows.filter(p=>p.state!=='verified-local').length,invalid:rows.filter(p=>p.invalidDate).length});
 return {version:1,scope:'private-browser-catalog',catalog:count(players),importedRoster:count(players.filter(p=>p.inImportedRoster)),players};
}
