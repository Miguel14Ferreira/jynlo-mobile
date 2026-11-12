import type {ImagePickerAsset} from 'expo-image-picker';
import {API_BASE,DEMO_MODE} from './api';
import {prepareChatPhoto} from './chat-photo-source';
import {validateChatAlbum,MAX_FILES,MAX_TOTAL_BYTES} from './chat-attachments-core.cjs';

export type AlbumChatTarget={scope:'direct'|'community'|'session';id:string|number};

function albumEndpoint(target:AlbumChatTarget):string{
 if(target.scope==='direct'){
  const peer=String(target.id);
  if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(peer))throw Error('Conversa inválida.');
  return '/api/chat/me/'+encodeURIComponent(peer)+'/attachments/batch';
 }
 const id=Number(target.id);
 if(!Number.isSafeInteger(id)||id<=0||String(id)!==String(target.id))
  throw Error('Identificador de conversa inválido.');
 if(target.scope!=='community'&&target.scope!=='session')throw Error('Conversa inválida.');
 return '/api/'+(target.scope==='community'?'communities':'sessions')+'/'+id+'/messages/attachments/batch';
}

/** Send 2–4 private photos as one atomic message; every file stays behind authorization. */
export async function sendChatPhotoAlbum(target:AlbumChatTarget,token:string,photos:ImagePickerAsset[],
 replyToMessageId?:number|null):Promise<void>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para enviar fotografias.');
 const path=albumEndpoint(target);
 if(!Array.isArray(photos)||photos.length<2||photos.length>MAX_FILES)
  throw Error('Escolhe entre 2 e 4 fotografias para um álbum.');
 const validation=validateChatAlbum(photos,{allowUnknownSize:true});
 if(validation)throw Error(validation);
 if(replyToMessageId!=null&&(!Number.isSafeInteger(replyToMessageId)||replyToMessageId<=0))
  throw Error('Resposta inválida.');
 const mimeExtensions:Record<string,string>={
  'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'
 };
 const prepared:Array<Awaited<ReturnType<typeof prepareChatPhoto>>>=[];
 try{
  const form=new FormData();
  let total=0;
  for(let index=0;index<photos.length;index++){
   const photo=photos[index]!;
   const extension=mimeExtensions[photo.mimeType||''];
   if(!extension)throw Error('Formato de fotografia não suportado.');
   const attachment=await prepareChatPhoto(photo,extension);
   prepared.push(attachment);
   total+=attachment.size;
   if(total>MAX_TOTAL_BYTES)throw Error('Os anexos excedem 40 MB no total.');
   form.append('files',{uri:attachment.uri,name:'jynlo-chat-'+(index+1)+'.'+extension,type:photo.mimeType} as unknown as Blob);
  }
  if(replyToMessageId!=null)form.append('replyToMessageId',String(replyToMessageId));
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),90000);
  try{
   const response=await fetch(API_BASE+path,{
    method:'POST',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
    credentials:'omit',body:form,signal:controller.signal
   });
   if(!response.ok){
    if(response.status===401)throw Error('A sessão expirou. Inicia sessão novamente.');
    if(response.status===403)throw Error('Já não tens permissão para enviar nesta conversa.');
    if(response.status===413)throw Error('O álbum ultrapassa o limite permitido pelo servidor.');
    if(response.status===503)throw Error('O armazenamento privado está indisponível.');
    throw Error('O servidor não aceitou o álbum. Verifica o histórico antes de repetir.');
   }
   const reply=await response.json() as {id?:number;attachments?:Array<{index:number}>};
   if(!Number.isSafeInteger(reply?.id)||reply.id!<=0||
      !Array.isArray(reply.attachments)||reply.attachments.length!==photos.length)
    throw Error('O envio não foi confirmado. Consulta o histórico antes de repetir.');
  }catch(error){
   if(controller.signal.aborted)
    throw Error('O envio excedeu o tempo limite. Consulta o histórico antes de repetir.');
   if(error instanceof Error&&/^(A sessão|Já não tens|O álbum|O armazenamento|O servidor|O envio)/.test(error.message))
    throw error;
   throw Error('Falha de ligação. Consulta o histórico antes de repetir.');
  }finally{clearTimeout(timeout);}
 }finally{
  for(const file of prepared)file.cleanup();
 }
}
