import {DEMO_MODE,request} from './api';
import type {ChatReactionKind} from './chat-reactions-api';

export type ChatSearchHit={
 id:number;sender:string;text:string|null;createdAt:string|null;
 replyToMessageId:number|null;replyToSender:string|null;replyToText:string|null
};
export type ChatSearchResponse={results:ChatSearchHit[];hasMore:boolean;page:number};
function queryParams(kind:ChatReactionKind,id:string){
 if(!['direct','community','session','private'].includes(kind))throw Error('Conversa inválida.');
 if(kind==='direct'){
  if(!/^[A-Za-z0-9._-]{1,128}$/.test(id))throw Error('Contacto inválido.');
 }else if(!/^[1-9][0-9]{0,15}$/.test(id)||!Number.isSafeInteger(Number(id)))throw Error('Conversa inválida.');
 return 'kind='+encodeURIComponent(kind)+'&id='+encodeURIComponent(id);
}
function validateHit(hit:ChatSearchHit):boolean{
 return Boolean(hit&&Number.isSafeInteger(hit.id)&&hit.id>0&&typeof hit.sender==='string'&&
  (hit.text===null||typeof hit.text==='string')&&
  (hit.createdAt===null||typeof hit.createdAt==='string'));
}
export async function searchChatMessages(kind:ChatReactionKind,id:string,q:string,page:number,token:string):Promise<ChatSearchResponse>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para pesquisar mensagens.');
 const term=q.trim();
 if(term.length<2||term.length>80)throw Error('Escreve entre 2 e 80 caracteres.');
 if(!Number.isSafeInteger(page)||page<0||page>50)throw Error('Página inválida.');
 const response=await request<ChatSearchResponse>('/api/messages/inbox/search?'+queryParams(kind,id)+'&q='+encodeURIComponent(term)+'&page='+page,{token});
 if(!response||!Array.isArray(response.results)||typeof response.hasMore!=='boolean'||response.page!==page)throw Error('Pesquisa inválida do servidor.');
 return {page,hasMore:response.hasMore,results:response.results.slice(0,20).filter(validateHit)};
}
export async function chatMessageContext(kind:ChatReactionKind,id:string,messageId:number,token:string):Promise<ChatSearchHit[]>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para consultar mensagens.');
 if(!Number.isSafeInteger(messageId)||messageId<=0)throw Error('Mensagem inválida.');
 const context=await request<ChatSearchHit[]>('/api/messages/inbox/context?'+queryParams(kind,id)+'&messageId='+messageId,{token});
 if(!Array.isArray(context))throw Error('Contexto inválido do servidor.');
 return context.slice(0,41).filter(validateHit);
}
