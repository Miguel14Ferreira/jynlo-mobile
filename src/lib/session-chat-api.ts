import {DEMO_MODE,request} from './api';

export interface SessionChatEntry {
 id:number;sessionId:number;senderUsername:string;body:string;createdAt:string;
 replyToMessageId:number|null;replyToSender:string|null;replyToText:string|null;
 attachmentName:string|null;attachmentMimeType:string|null;attachmentSize:number|null;
 editedAt:string|null;deletedAt:string|null;senderGuest:boolean;
}
function validSessionId(id:number):number{
 if(!Number.isSafeInteger(id)||id<=0)throw Error('Sessão inválida.');
 return id;
}
export async function sessionChatHistory(id:number,token:string):Promise<SessionChatEntry[]>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para acederes ao chat.');
 return request<SessionChatEntry[]>(`/api/sessions/${validSessionId(id)}/messages`,{token});
}
export async function postSessionChat(id:number,body:string,token:string,replyToMessageId?:number|null):Promise<SessionChatEntry>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para enviares mensagens.');
 const text=body.trim();
 if(!text||text.length>2000)throw Error('Escreve uma mensagem até 2000 caracteres.');
 if(replyToMessageId!=null&&(!Number.isSafeInteger(replyToMessageId)||replyToMessageId<=0))
  throw Error('Mensagem citada inválida.');
 // No automatic retry after ambiguous POST; the backend owns permissions and kickoff status.
 return request<SessionChatEntry>(`/api/sessions/${validSessionId(id)}/messages`,{
  token,method:'POST',body:{body:text,replyToMessageId:replyToMessageId??null}
 });
}
export async function markSessionChatRead(id:number,messageId:number,token:string):Promise<void>{
 if(DEMO_MODE||!token||!Number.isSafeInteger(messageId)||messageId<=0)return;
 await request(`/api/messages/inbox/read`,{
  token,method:'PUT',body:{kind:'session',id:String(validSessionId(id)),lastSeenMessageId:messageId}
 });
}
