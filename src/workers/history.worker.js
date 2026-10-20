import {importSeasonTexts,importLocalFile,CSV_LIMIT,JSON_LIMIT} from '../data/local-history.js';
self.onmessage=async({data})=>{
 try{
  let result;
  if(data.type==='season'){
   const texts={};
   for(const [index,key] of ['players','teams','schedule'].entries()){
    const file=data.files[key];
    if(!file||file.size>CSV_LIMIT)throw Error('Selecciona los tres CSV. El tamaño máximo es de 64 MB por archivo.');
    self.postMessage({type:'progress',message:`Leyendo archivo ${index+1} de 3…`});texts[key]=await file.text();
   }
   self.postMessage({type:'progress',message:'Convirtiendo estadísticas y combinando temporadas…'});
   result=importSeasonTexts(texts,data.base);
  }else if(data.type==='file'){
   const file=data.file;
   if(!file||file.size>JSON_LIMIT)throw Error('El archivo supera el máximo de 256 MB.');
   self.postMessage({type:'progress',message:'Leyendo y validando el historial…'});
   result={dataset:importLocalFile(await file.text(),file.name,data.base),report:null};
  }else throw Error('Operación de importación desconocida.');
  self.postMessage({type:'result',...result});
 }catch(error){self.postMessage({type:'error',message:error.message||'No se pudo importar el archivo.'});}
};
