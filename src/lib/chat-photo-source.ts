import type {ImagePickerAsset} from 'expo-image-picker';

/** Android document picker results may be content:// URIs, not attachable by native fetch. */
export async function prepareChatPhoto(asset:ImagePickerAsset,extension:string):Promise<{
 uri:string;size:number;cleanup:()=>void
}>{
 if(!asset.uri)throw Error('Fotografia inválida.');
 const {File,Paths}=await import('expo-file-system');
 let uri=asset.uri;
 let temporary:InstanceType<typeof File>|null=null;
 try{
  const source=new File(uri);
  if(!uri.startsWith('file://')){
   temporary=new File(Paths.cache,'jynlo-chat-'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+extension);
   source.copy(temporary);
   uri=temporary.uri;
  }
  const actualSize=temporary?(temporary.exists?temporary.size:-1):(source.exists?source.size:-1);
  // Picker metadata may be stale or forged; never upload an unmeasured private file.
  if(!Number.isSafeInteger(actualSize)||actualSize<=0)
   throw Error('Não foi possível confirmar o tamanho real da fotografia. Escolhe novamente o ficheiro.');
  const size=actualSize;
  if(size>5*1024*1024)
   throw Error('A fotografia tem de ter até 5 MB.');
  return {uri,size,cleanup:()=>{if(temporary){try{if(temporary.exists)temporary.delete();}catch{}}}};
 }catch(e){
  if(temporary){try{if(temporary.exists)temporary.delete();}catch{}}
  throw e;
 }
}

/** Prepare a private image or video for one atomic chat batch upload. */
export async function prepareChatMedia(asset:ImagePickerAsset,extension:string):Promise<{
 uri:string;size:number;cleanup:()=>void
}>{
 const mime=asset.mimeType||'';
 const max=asset.type==='video'?20*1024*1024:5*1024*1024;
 if(!asset.uri||(asset.type!=='image'&&asset.type!=='video')||
    (asset.type==='video'?!['video/mp4','video/webm'].includes(mime):
      !['image/jpeg','image/png','image/webp','image/gif'].includes(mime)))
  throw Error('O ficheiro selecionado não é suportado pela Jynlo.');
 const {File,Paths}=await import('expo-file-system');
 let temporary:InstanceType<typeof File>|null=null;
 try{
  const original=new File(asset.uri);
  let uri=asset.uri;
  if(!uri.startsWith('file://')){
   temporary=new File(Paths.cache,'jynlo-private-'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+extension);
   original.copy(temporary);
   uri=temporary.uri;
  }
  const actual=temporary?(temporary.exists?temporary.size:-1):(original.exists?original.size:-1);
  // Every private upload requires a verified size from the actual native file.
  // Gallery metadata is advisory only, including for photos and copied content:// URIs.
  if(!Number.isSafeInteger(actual)||actual<=0)
   throw Error(asset.type==='video'?
    'Não foi possível confirmar o tamanho real do vídeo. Escolhe novamente o ficheiro.':
    'Não foi possível confirmar o tamanho real da fotografia. Escolhe novamente o ficheiro.');
  const size=actual;
  if(size>max)
   throw Error(asset.type==='video'?'O vídeo deve ter até 20 MB.':'A fotografia deve ter até 5 MB.');
  return {uri,size,cleanup:()=>{try{if(temporary?.exists)temporary.delete();}catch{}}};
 }catch(error){try{if(temporary?.exists)temporary.delete();}catch{}throw error;}
}
