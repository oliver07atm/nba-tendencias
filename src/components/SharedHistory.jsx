import React,{useState} from 'react';
import {Database,RefreshCw,LogIn,LogOut,UploadCloud,DownloadCloud} from 'lucide-react';
import {asUnverifiedHistory} from '../data/local-history.js';

const SUPABASE_URL=(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/+$/,'');
const SUPABASE_KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'';
const OWNER_ID='78333705-42f0-431d-99b7-1a0ba385d693';
const SESSION_KEY='nba-tendencias-shared-session';

function readSession(){
 try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch{return null;}
}
function saveSession(session){
 try{localStorage.setItem(SESSION_KEY,JSON.stringify(session));}catch{}
}
function clearSession(){
 try{localStorage.removeItem(SESSION_KEY);}catch{}
}
function requireConfig(){
 if(!SUPABASE_URL||!SUPABASE_KEY)throw Error('Falta configurar la conexión en GitHub. La web aún no tiene la URL y la clave pública de Supabase en sus variables de publicación.');
}
function normalizeSession(payload){
 return {...payload,expires_at:payload.expires_at||Math.floor(Date.now()/1000)+(payload.expires_in||3600)};
}
async function authenticate(email,password){
 requireConfig();
 const response=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=password',{
  method:'POST',
  headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},
  body:JSON.stringify({email,password})
 });
 const body=await response.json().catch(()=>null);
 if(!response.ok)throw Error(body?.msg||body?.message||body?.error_description||'No se pudo iniciar sesión. Comprueba el correo y la contraseña.');
 const session=normalizeSession(body);
 saveSession(session);
 return session;
}
async function validSession(current){
 requireConfig();
 let session=current||readSession();
 if(!session?.access_token)throw Error('Inicia sesión para acceder al historial compartido.');
 if(Number(session.expires_at||0)>Math.floor(Date.now()/1000)+60)return session;
 if(!session.refresh_token)throw Error('La sesión ha caducado. Inicia sesión de nuevo.');
 const response=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{
  method:'POST',
  headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},
  body:JSON.stringify({refresh_token:session.refresh_token})
 });
 const body=await response.json().catch(()=>null);
 if(!response.ok){
  clearSession();
  throw Error('La sesión ha caducado. Inicia sesión de nuevo.');
 }
 session=normalizeSession(body);
 saveSession(session);
 return session;
}
async function downloadDataset(current){
 const session=await validSession(current);
 const response=await fetch(SUPABASE_URL+'/storage/v1/object/authenticated/nba-history/history.json.gz',{
  headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+session.access_token}
 });
 if(!response.ok){
  const body=await response.json().catch(()=>null);
  if(response.status===400||response.status===404)throw Error('Todavía no se ha publicado un historial o esta cuenta no tiene permiso para leerlo.');
  throw Error(body?.message||body?.error||'No se pudo descargar el historial compartido.');
 }
 if(typeof DecompressionStream==='undefined')throw Error('Este navegador no admite la descompresión del historial. Actualiza el navegador e inténtalo de nuevo.');
 const blob=await response.blob();
 const raw=await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text();
 const dataset=asUnverifiedHistory(JSON.parse(raw));
 if(dataset.meta.mode==='demo')throw Error('El archivo compartido contiene una demostración, no un historial personal.');
 return {dataset,session};
}

export default function SharedHistory({history,onLoadDataset}){
 const [session,setSession]=useState(()=>readSession());
 const [email,setEmail]=useState(()=>readSession()?.user?.email||'');
 const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const canPublish=session?.user?.id===OWNER_ID;

 async function signIn(e){
  e.preventDefault();
  if(busy)return;
  setBusy(true);setError('');setMessage('');
  try{
   const next=await authenticate(email.trim(),password);
   setSession(next);setPassword('');
   try{
    const result=await downloadDataset(next);
    saveSession(result.session);setSession(result.session);
    onLoadDataset(result.dataset);
    setMessage('Historial compartido cargado correctamente.');
   }catch(loadError){
    setError(loadError.message||'Has iniciado sesión, pero no se pudo cargar el historial. Si eres el propietario, puedes publicarlo desde tu historial local.');
   }
  }catch(err){setError(err.message||'No se pudo iniciar sesión.');}
  finally{setBusy(false);}
 }
 async function reloadShared(){
  if(!session||busy)return;
  setBusy(true);setError('');setMessage('');
  try{
   const result=await downloadDataset(session);
   saveSession(result.session);setSession(result.session);
   onLoadDataset(result.dataset);
   setMessage('Historial compartido cargado correctamente.');
  }catch(err){setError(err.message||'No se pudo cargar el historial compartido.');}
  finally{setBusy(false);}
 }
 async function publishShared(){
  if(!session||!history?.dataset||busy)return;
  setBusy(true);setError('');setMessage('');
  try{
   const valid=await validSession(session);
   setSession(valid);
   if(valid.user?.id!==OWNER_ID)throw Error('Esta cuenta solo tiene permiso de lectura.');
   const dataset=asUnverifiedHistory(history.dataset);
   if(dataset.meta.mode==='demo')throw Error('Carga primero tu historial personal; no se puede publicar la demostración.');
   if(typeof CompressionStream==='undefined')throw Error('Este navegador no permite comprimir el historial. Actualiza el navegador e inténtalo de nuevo.');
   const stream=new Blob([JSON.stringify(dataset)],{type:'application/json'}).stream().pipeThrough(new CompressionStream('gzip'));
   const compressed=await new Response(stream).blob();
   const response=await fetch(SUPABASE_URL+'/storage/v1/object/nba-history/history.json.gz',{
    method:'POST',
    headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+valid.access_token,'Content-Type':'application/gzip','x-upsert':'true'},
    body:compressed
   });
   if(!response.ok){
    const body=await response.json().catch(()=>null);
    throw Error(body?.message||body?.error||'No se pudo publicar el historial. Comprueba los permisos y el límite de tamaño de Supabase Storage.');
   }
   onLoadDataset(dataset);
   setMessage('Historial publicado: '+dataset.records.length.toLocaleString('es-ES')+' registros ('+(compressed.size/1024/1024).toLocaleString('es-ES',{maximumFractionDigits:1})+' MB comprimidos).');
  }catch(err){setError(err.message||'No se pudo publicar el historial.');}
  finally{setBusy(false);}
 }
 function signOut(){
  clearSession();setSession(null);setPassword('');setError('');setMessage('Sesión cerrada en este navegador.');
 }

 return <section className="panel data-card shared-history">
  <div className="section-heading"><div><span className="eyebrow">ACCESO PRIVADO</span><h2><Database size={20}/> Historial compartido</h2></div><span className="subtle-pill">Supabase · acceso autorizado</span></div>
  {!session?<form onSubmit={signIn}>
   <p>Inicia sesión con la cuenta que te haya creado el propietario. No hay registro público.</p>
   <div className="filter-grid">
    <label className="field"><span>Correo electrónico</span><input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <label className="field"><span>Contraseña</span><input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
   </div>
   <button className="primary" type="submit" disabled={busy}><LogIn size={16}/>{busy?'Conectando…':'Iniciar sesión'}</button>
  </form>:<div>
   <p>Sesión iniciada: <strong>{session.user?.email||email}</strong>. {canPublish?'Permiso de propietario: puedes publicar actualizaciones.':'Modo de solo lectura.'}</p>
   <div className="history-actions">
    <button className="secondary" type="button" onClick={reloadShared} disabled={busy}><DownloadCloud size={15}/>{busy?'Cargando…':'Cargar historial compartido'}</button>
    {canPublish&&<button className="primary" type="button" onClick={publishShared} disabled={busy||!history?.dataset||history.dataset.meta.mode==='demo'}><UploadCloud size={15}/>{busy?'Procesando…':'Publicar / actualizar desde mi historial local'}</button>}
    <button className="text-button" type="button" onClick={signOut} disabled={busy}><LogOut size={15}/> Cerrar sesión</button>
   </div>
   {canPublish&&!history?.dataset&&<p className="muted">Primero importa o recupera tu historial personal para habilitar la publicación.</p>}
   {canPublish&&history?.dataset?.meta?.mode==='demo'&&<p className="muted">Estás usando la demostración. Activa tu historial personal para poder publicarlo.</p>}
  </div>}
  {error&&<p className="failure" role="alert">{error}</p>}
  {message&&<p className="success" role="status">{message}</p>}
  <p className="muted">El archivo se guarda comprimido en un almacenamiento privado. Los permisos se aplican en Supabase: las cuentas de solo lectura no pueden modificarlo.</p>
 </section>;
}
