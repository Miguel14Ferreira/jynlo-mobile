import {File} from 'expo-file-system';
import type {DocumentPickerAsset} from 'expo-document-picker';
import {API_BASE,DEMO_MODE} from './api';

export type PdfChatScope='direct'|'community'|'session';
export type PdfChatTarget={scope:PdfChatScope;id:string|number};
const MAX_BYTES=5*1024*1024;
export function privatePdfEndpoint(target:PdfChatTarget):string{
 const {scope,id}=target;
 if(scope==='direct'){
  const peer=String(id);
  if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(peer))throw Error('Conversa inválida.');
  return '/api/chat/me/'+encodeURIComponent(peer)+'/attachments';
 }
 const numeric=Number(id);
 if(!Number.isSafeInteger(numeric)||numeric<=0||String(numeric)!==String(id))
  throw Error('Conversa inválida.');
 if(scope!=='community'&&scope!=='session')throw Error('Tipo de conversa inválido.');
 return '/api/'+(scope==='community'?'communities':'sessions')+'/'+numeric+'/messages/attachments';
}
export function checkPdfAsset(asset:DocumentPickerAsset):void{
 if(!asset.uri||!asset.name||!asset.name.toLowerCase().endsWith('.pdf')||
   asset.mimeType!=='application/pdf')throw Error('Seleciona um documento PDF válido.');
 if(!Number.isSafeInteger(asset.size)||!asset.size||asset.size>MAX_BYTES)
  throw Error('O PDF deve ter um tamanho conhecido até 5 MB.');
}
export async function sendChatPdf(
 target:PdfChatTarget,token:string,asset:DocumentPickerAsset,replyId?:number|null
):Promise<void>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para enviar PDFs.');
 const path=privatePdfEndpoint(target);
 checkPdfAsset(asset);
 if(replyId!=null&&(!Number.isSafeInteger(replyId)||replyId<=0))
  throw Error('Mensagem citada inválida.');
 // Verify file signature locally before transmitting; the backend verifies bytes again.
 const file=new File(asset.uri);
 if(!file.exists||file.size!==asset.size)throw Error('O ficheiro selecionado já não está disponível.');
 const bytes=await file.bytes();
 if(bytes.length!==asset.size||bytes.length<5||
   bytes[0]!==37||bytes[1]!==80||bytes[2]!==68||bytes[3]!==70||bytes[4]!==45)
  throw Error('O ficheiro selecionado não é um PDF válido.');
 const form=new FormData();
 const safeName=asset.name.replace(/[\\/\x00-\x1f\x7f]/g,'_').slice(-140);
 form.append('file',file as unknown as Blob,safeName);
 if(replyId!=null)form.append('replyToMessageId',String(replyId));
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetch(API_BASE+path,{
   method:'POST',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
   credentials:'omit',redirect:'error',body:form,signal:controller.signal
  });
  if(!response.ok){
   if(response.status===401)throw Error('Sessão expirada. Inicia sessão novamente.');
   if(response.status===403)throw Error('Sem permissão para enviar nesta conversa.');
   if(response.status===413)throw Error('O PDF ultrapassa o limite permitido.');
   if(response.status===503)throw Error('Armazenamento privado indisponível.');
   throw Error('O servidor não aceitou o PDF.');
  }
  const result=await response.json() as {id?:number;attachmentMimeType?:string|null};
  if(!Number.isSafeInteger(result.id)||result.attachmentMimeType!=='application/pdf')
   throw Error('Não foi possível confirmar o envio. Consulta o histórico antes de repetir.');
 }catch(e){
  if(controller.signal.aborted)
   throw Error('Tempo esgotado. Consulta o histórico antes de repetir.');
  if(e instanceof Error)throw e;
  throw Error('Falha na ligação. Consulta o histórico antes de repetir.');
 }finally{clearTimeout(timeout);}
}
