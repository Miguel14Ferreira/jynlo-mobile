import {API_BASE,DEMO_MODE} from './api';
import type {ImagePickerAsset} from 'expo-image-picker';
import type {DirectChatEntry} from './chat-api';

const MAX_BYTES=5*1024*1024;
const PEER=/^[a-zA-Z0-9_.@-]{1,128}$/;
const MIMES=['image/jpeg','image/png','image/webp','image/gif'];

function base(peer:string):string{
 if(!PEER.test(peer))throw Error('Conversa inválida.');
 return API_BASE+'/api/chat/me/'+encodeURIComponent(peer)+'/attachments';
}

export async function directPhotoAvailable(peer:string,token:string):Promise<boolean>{
 if(DEMO_MODE||!token)return false;
 const result=await fetch(base(peer)+'/availability',{
  headers:{Authorization:'Bearer '+token,Accept:'application/json'},credentials:'omit'
 });
 if(!result.ok)throw Error('Não foi possível confirmar a disponibilidade dos anexos.');
 const data=await result.json() as {available?:boolean};
 return data.available===true;
}

/** A private attachment requires an explicit user action, never retry uncertain POSTs. */
export async function sendDirectPhoto(peer:string,token:string,asset:ImagePickerAsset):Promise<DirectChatEntry>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para partilhares fotografias.');
 if(!asset.uri||asset.type!=='image')throw Error('Seleciona uma fotografia válida.');
 if(asset.fileSize==null||asset.fileSize<=0||asset.fileSize>MAX_BYTES)
  throw Error('A fotografia tem de ter um tamanho conhecido até 5 MB.');
 const mime=asset.mimeType||'';
 if(!MIMES.includes(mime))throw Error('Escolhe uma fotografia JPG, PNG, WebP ou GIF.');
 const extension=mime==='image/png'?'png':mime==='image/webp'?'webp':mime==='image/gif'?'gif':'jpg';
 const form=new FormData();
 form.append('file',{uri:asset.uri,name:'jynlo-chat.'+extension,type:mime} as unknown as Blob);
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetch(base(peer),{
   method:'POST',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
   body:form,credentials:'omit',signal:controller.signal
  });
  if(!response.ok){
   if(response.status===401)throw Error('A sessão expirou. Inicia sessão novamente.');
   if(response.status===403)throw Error('Não tens autorização para enviar anexos nesta conversa.');
   if(response.status===413)throw Error('Fotografia demasiado grande para o servidor.');
   if(response.status===503)throw Error('O armazenamento privado está indisponível.');
   throw Error('O servidor não aceitou a fotografia.');
  }
  const message=await response.json() as DirectChatEntry;
  if(!Number.isSafeInteger(message.id)||!message.attachmentName)
   throw Error('O envio não foi confirmado. Consulta o histórico antes de tentar novamente.');
  return message;
 }catch(error){
  if(controller.signal.aborted)throw Error('Tempo esgotado. Consulta o histórico antes de tentar novamente.');
  if(error instanceof Error&&/^(A sessão|Não tens autorização|Fotografia|O armazenamento|O servidor|O envio)/.test(error.message))
   throw error;
  throw Error('Não foi possível confirmar o envio. Consulta o histórico antes de repetir.');
 }finally{clearTimeout(timer);}
}
