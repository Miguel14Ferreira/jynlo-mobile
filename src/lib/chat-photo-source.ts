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
  const size=temporary?.size||asset.fileSize||(source.exists?source.size:0);
  if(!Number.isFinite(size)||size<=0||size>5*1024*1024)
   throw Error('A fotografia tem de ter até 5 MB e um tamanho válido.');
  return {uri,size,cleanup:()=>{if(temporary){try{if(temporary.exists)temporary.delete();}catch{}}}};
 }catch(e){
  if(temporary){try{if(temporary.exists)temporary.delete();}catch{}}
  throw e;
 }
}
