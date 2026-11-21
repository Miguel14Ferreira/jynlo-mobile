import {DEMO_MODE,request} from './api';

export type ChatReactionKind='direct'|'community'|'session'|'private';
export type ChatReactionEmoji='👍'|'❤️'|'😂'|'🎉'|'👏'|'🔥';
export const CHAT_REACTION_EMOJIS:readonly ChatReactionEmoji[]=['👍','❤️','😂','🎉','👏','🔥'];
export type ChatReactionSummary={messageId:number;counts:Record<string,number>;myEmoji:string|null};
export type ChatReactionParticipant={username:string;displayName:string;profilePicUrl:string|null;emoji:string;mine:boolean};

function validateConversation(kind:ChatReactionKind,id:string):string{
 if(!['direct','community','session','private'].includes(kind))throw Error('Tipo de chat inválido.');
 if(kind==='direct'){
  if(!/^[A-Za-z0-9._-]{1,128}$/.test(id))throw Error('Contacto inválido.');
  return encodeURIComponent(id);
 }
 if(!/^[1-9][0-9]{0,15}$/.test(id)||!Number.isSafeInteger(Number(id)))throw Error('Conversa inválida.');
 return encodeURIComponent(String(Number(id)));
}
function validateMessageId(value:number):number{
 if(!Number.isSafeInteger(value)||value<=0)throw Error('Mensagem inválida.');
 return value;
}
function endpoint(kind:ChatReactionKind,id:string){
 return '/api/messages/reactions/'+kind+'/'+validateConversation(kind,id);
}
function checkedSummary(value:ChatReactionSummary):ChatReactionSummary{
 if(!value||!Number.isSafeInteger(value.messageId)||value.messageId<=0||!value.counts||typeof value.counts!=='object'||Array.isArray(value.counts))
  throw Error('Reação inválida do servidor.');
 const counts:Record<string,number>={};
 for(const emoji of CHAT_REACTION_EMOJIS){
  const count=value.counts[emoji];
  if(typeof count==='number'&&Number.isSafeInteger(count)&&count>0)counts[emoji]=count;
 }
 return {messageId:value.messageId,counts,
  myEmoji:CHAT_REACTION_EMOJIS.includes(value.myEmoji as ChatReactionEmoji)?value.myEmoji:null};
}
export async function listChatReactions(kind:ChatReactionKind,id:string,ids:number[],token:string):Promise<ChatReactionSummary[]>{
 if(!token||DEMO_MODE||ids.length===0)return [];
 if(ids.length>100||new Set(ids).size!==ids.length)throw Error('Lista de mensagens inválida.');
 ids.forEach(validateMessageId);
 const result=await request<ChatReactionSummary[]>(endpoint(kind,id)+'?ids='+ids.join(','),{token});
 if(!Array.isArray(result))throw Error('Reações inválidas do servidor.');
 const allowed=new Set(ids);
 return result.map(checkedSummary).filter(item=>allowed.has(item.messageId));
}
export async function changeChatReaction(kind:ChatReactionKind,id:string,messageId:number,emoji:ChatReactionEmoji|null,token:string):Promise<ChatReactionSummary>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para reagir.');
 validateMessageId(messageId);
 if(emoji!==null&&!CHAT_REACTION_EMOJIS.includes(emoji))throw Error('Reação não permitida.');
 const value=await request<ChatReactionSummary>(endpoint(kind,id)+'/'+messageId,{
  token,method:emoji===null?'DELETE':'PUT',...(emoji===null?{}:{body:{emoji}})
 });
 const checked=checkedSummary(value);
 if(checked.messageId!==messageId)throw Error('O servidor confirmou outra mensagem.');
 return checked;
}

export async function chatReactionParticipants(kind:ChatReactionKind,id:string,messageId:number,token:string):Promise<ChatReactionParticipant[]>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para consultar as reações.');
 validateMessageId(messageId);
 const result=await request<ChatReactionParticipant[]>(endpoint(kind,id)+'/'+messageId+'/participants',{token});
 if(!Array.isArray(result))throw Error('Participantes inválidos.');
 return result.slice(0,200).filter(member=>member&&typeof member.username==='string'&&
  typeof member.displayName==='string'&&member.displayName.length>0&&
  typeof member.emoji==='string'&&CHAT_REACTION_EMOJIS.includes(member.emoji as ChatReactionEmoji));
}
