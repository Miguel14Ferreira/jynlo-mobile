import {fetch as expoFetch} from 'expo/fetch';
import {File} from 'expo-file-system';
import {API_BASE,DEMO_MODE} from './api';
import type {ImagePickerAsset} from 'expo-image-picker';
import type {CommunityChatEntry} from './types';
import type {SessionChatEntry} from './session-chat-api';
import {prepareChatPhoto} from './chat-photo-source';
import {confirmedSingleChatPhotoReply} from './chat-attachments-core.cjs';

type ChatKind='community'|'session';
function photoUrl(kind:ChatKind,id:number):string{
 if(!Number.isSafeInteger(id)||id<=0)throw Error('Identificador inválido.');
 return API_BASE+'/api/'+(kind==='community'?'communities':'sessions')+'/'+id+'/messages/attachments';
}
export async function chatPhotoAvailable(kind:ChatKind,id:number,token:string):Promise<boolean>{
 if(DEMO_MODE||!token)return false;
 const response=await fetch(photoUrl(kind,id)+'/availability',{
  headers:{Authorization:'Bearer '+token,Accept:'application/json'},credentials:'omit',redirect:'error'
 });
 if(!response.ok)return false;
 return ((await response.json()) as {available?:boolean}).available===true;
}
export async function sendChatPhoto(kind:'community',id:number,token:string,asset:ImagePickerAsset,replyId?:number|null):Promise<CommunityChatEntry>;
export async function sendChatPhoto(kind:'session',id:number,token:string,asset:ImagePickerAsset,replyId?:number|null):Promise<SessionChatEntry>;
export async function sendChatPhoto(kind:ChatKind,id:number,token:string,asset:ImagePickerAsset,replyId?:number|null):Promise<CommunityChatEntry|SessionChatEntry>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para enviar uma fotografia.');
 const url=photoUrl(kind,id);
 if(asset.type!=='image'||!asset.uri)throw Error('Fotografia inválida.');
 if(asset.fileSize!=null&&asset.fileSize>5*1024*1024)throw Error('Fotografia com mais de 5 MB.');
 const formats:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
 const extension=formats[asset.mimeType||''];
 if(!extension)throw Error('Formato de fotografia não suportado.');
 if(replyId!=null&&(!Number.isSafeInteger(replyId)||replyId<=0))throw Error('Resposta inválida.');
 const prepared=await prepareChatPhoto(asset,extension);
 // Clean temporary picker copies even if form construction fails.
 try{
 const form=new FormData();
 form.append('file',new File(prepared.uri) as unknown as Blob,'jynlo-chat.'+extension);
 if(replyId!=null)form.append('replyToMessageId',String(replyId));
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await expoFetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,Accept:'application/json'},credentials:'omit',redirect:'error',body:form,signal:controller.signal});
  if(!response.ok){
   if(kind==='session'&&response.status===409)
    throw Error('O chat do jogo está encerrado. Confirma o estado do jogo.');
   if(kind==='session'&&[401,403,410].includes(response.status))
    throw Error('Já não tens permissão para enviar nesta conversa.');
   throw Error('O servidor recusou o envio ('+response.status+').');
  }
  let result:CommunityChatEntry|SessionChatEntry;
  try{result=await response.json() as CommunityChatEntry|SessionChatEntry;}
  catch{throw Error('O envio não foi confirmado. Confirma o histórico antes de repetir.');}
  if(!confirmedSingleChatPhotoReply(result,kind,id,asset.mimeType||'',replyId))
   throw Error('O servidor não confirmou o anexo nesta conversa. Confirma o histórico antes de repetir.');
  return result;
 }catch(e){
  if(controller.signal.aborted)throw Error('Tempo esgotado. Confirma o histórico antes de repetir.');
  throw e instanceof Error?e:Error('Falha no envio. Confirma o histórico antes de repetir.');
 }finally{clearTimeout(timer);}
 }finally{prepared.cleanup();}
}
