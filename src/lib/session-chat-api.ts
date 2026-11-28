import {DEMO_MODE,request} from './api';

export interface SessionChatEntry {
 id:number;sessionId:number;senderUsername:string;body:string;createdAt:string;
 replyToMessageId:number|null;replyToSender:string|null;replyToText:string|null;
 attachmentName:string|null;attachmentMimeType:string|null;attachmentSize:number|null;
 attachments?:Array<{index:number;filename:string;mimeType:string;size:number}>|null;
 editedAt:string|null;deletedAt:string|null;senderGuest:boolean;
}
function validSessionId(id:number):number{
 if(!Number.isSafeInteger(id)||id<=0)throw Error('Jogo inválida.');
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
/** Session messages can only be changed by their author, while chat is accessible. */
export async function editSessionChatMessage(id:number,messageId:number,text:string,token:string):Promise<SessionChatEntry>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para editar mensagens.');
 if(!Number.isSafeInteger(messageId)||messageId<=0)throw Error('Mensagem inválida.');
 const body=text.trim();
 if(!body||body.length>2000||body.startsWith('[JYNLO:GIPHY:1]'))
  throw Error('A edição deve ter entre 1 e 2000 caracteres.');
 return request<SessionChatEntry>(`/api/sessions/${validSessionId(id)}/messages/${messageId}`,{
  token,method:'PUT',body:{text:body}
 });
}
export async function deleteSessionChatMessage(id:number,messageId:number,token:string):Promise<SessionChatEntry>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para apagar mensagens.');
 if(!Number.isSafeInteger(messageId)||messageId<=0)throw Error('Mensagem inválida.');
 return request<SessionChatEntry>(`/api/sessions/${validSessionId(id)}/messages/${messageId}`,{
  token,method:'DELETE'
 });
}
export async function markSessionChatRead(id:number,messageId:number,token:string):Promise<void>{
 if(DEMO_MODE||!token||!Number.isSafeInteger(messageId)||messageId<=0)return;
 await request(`/api/messages/inbox/read`,{
  token,method:'PUT',body:{kind:'session',id:String(validSessionId(id)),lastSeenMessageId:messageId}
 });
}
