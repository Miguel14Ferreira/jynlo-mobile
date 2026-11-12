import {DEMO_MODE,request} from './api';

export type MutableConversationKind='direct'|'community'|'session'|'private';
export interface MutedConversation{kind:MutableConversationKind;id:string}
const supported=new Set<MutableConversationKind>(['direct','community','session','private']);

function conversationKey(kind:MutableConversationKind,id:string):string{
 if(!supported.has(kind))throw Error('Tipo de conversa inválido.');
 if(kind==='direct'){
  if(!/^[a-zA-Z0-9._-]{1,128}$/.test(id))throw Error('Contacto inválido.');
  return id.toLowerCase();
 }
 if(!/^[1-9][0-9]{0,15}$/.test(id)||!Number.isSafeInteger(Number(id)))
  throw Error('Conversa inválida.');
 return String(Number(id));
}
export function isConversationMuted(mutes:ReadonlyArray<MutedConversation>,kind:MutableConversationKind,id:string):boolean{
 let key:string;
 try{key=conversationKey(kind,id);}catch{return false;}
 return mutes.some(item=>item.kind===kind&&typeof item.id==='string'&&item.id.toLowerCase()===key);
}
/** Server-owned account setting shared across Web and Android. */
export async function listConversationMutes(token:string):Promise<MutedConversation[]>{
 if(!token||DEMO_MODE)return [];
 const raw=await request<MutedConversation[]>('/api/notifications/me/conversation-mutes',{token});
 if(!Array.isArray(raw))throw Error('Preferências de notificações inválidas.');
 return raw.filter(item=>{
  if(!item||!supported.has(item.kind)||typeof item.id!=='string')return false;
  try{conversationKey(item.kind,item.id);return true;}catch{return false;}
 });
}
export async function setConversationMuted(kind:MutableConversationKind,id:string,muted:boolean,token:string):Promise<void>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para gerir os avisos.');
 const key=conversationKey(kind,id);
 await request<MutedConversation>('/api/notifications/me/conversation-mutes',{
  token,method:'PUT',body:{kind,id:key,muted}
 });
}
