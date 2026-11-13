import type {ImagePickerAsset} from 'expo-image-picker';
import {API_BASE,DEMO_MODE} from './api';
import {prepareChatMedia} from './chat-photo-source';
import {validateChatAlbum,MAX_FILES,MAX_TOTAL_BYTES,confirmedChatAlbumReply} from './chat-attachments-core.cjs';

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

/** Send 1–4 private photos or videos as one authorized, atomic message. */
export async function sendChatPhotoAlbum(target:AlbumChatTarget,token:string,photos:ImagePickerAsset[],
 replyToMessageId?:number|null,caption?:string):Promise<void>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para enviar ficheiros.');
 const path=albumEndpoint(target);
 if(!Array.isArray(photos)||photos.length<1||photos.length>MAX_FILES)
  throw Error('Escolhe entre 1 e 4 fotografias ou vídeos.');
 const validation=validateChatAlbum(photos,{allowUnknownSize:true});
 if(validation)throw Error(validation);
 if(typeof caption==='string'&&caption.length>2000)throw Error('A legenda não pode exceder 2000 caracteres.');
 if(replyToMessageId!=null&&(!Number.isSafeInteger(replyToMessageId)||replyToMessageId<=0))
  throw Error('Resposta inválida.');
 const mimeExtensions:Record<string,string>={
  'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif',
  'video/mp4':'mp4','video/webm':'webm'
 };
 const prepared:Array<Awaited<ReturnType<typeof prepareChatMedia>>>=[];
 try{
  const form=new FormData();
  let total=0;
  for(let index=0;index<photos.length;index++){
   const photo=photos[index]!;
   const extension=mimeExtensions[photo.mimeType||''];
   if(!extension)throw Error('Formato de fotografia ou vídeo não suportado.');
   const attachment=await prepareChatMedia(photo,extension);
   prepared.push(attachment);
   total+=attachment.size;
   if(total>MAX_TOTAL_BYTES)throw Error('Os anexos excedem 40 MB no total.');
   form.append('files',{uri:attachment.uri,name:'jynlo-chat-'+(index+1)+'.'+extension,type:photo.mimeType} as unknown as Blob);
  }
  if(caption?.trim())form.append('caption',caption.trim());
  if(replyToMessageId!=null)form.append('replyToMessageId',String(replyToMessageId));
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),120000);
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
   // A 2xx response can already have created the message even if its JSON
   // body is truncated. Never describe this as a connection failure.
   let reply:{id?:number;attachments?:Array<{index:number;filename:string;mimeType:string;size:number}>};
   try{
    reply=await response.json() as typeof reply;
   }catch{
    throw Error('O envio não foi confirmado. Consulta o histórico antes de repetir.');
   }
   if(!confirmedChatAlbumReply(reply,photos.map(photo=>photo.mimeType||'')))
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
