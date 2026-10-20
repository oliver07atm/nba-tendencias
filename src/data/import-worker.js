export function importInBrowser(input,onProgress=()=>{}){
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('../workers/history.worker.js',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{
   if(data.type==='progress'){onProgress(data.message);return;}
   worker.terminate();
   if(data.type==='error')reject(Error(data.message));else resolve(data);
  };
  worker.onerror=()=>{worker.terminate();reject(Error('No se pudo completar la importación. Comprueba los archivos o prueba con una temporada cada vez.'));};
  worker.onmessageerror=()=>{worker.terminate();reject(Error('El navegador no pudo procesar este historial. Prueba con archivos más pequeños.'));};
  try{worker.postMessage(input);}catch(error){worker.terminate();reject(error);}
 });
}
