import {DEMO_MODE,request} from './api';

export type ChatPollKind='session'|'community'|'private'|'team';
export interface ChatPollVoter{username:string;profilePicUrl:string|null}
export interface ChatPollResult{messageId:number;counts:number[];total:number;mine:number|null;voters?:ChatPollVoter[][]}

function base(kind:ChatPollKind,conversationId:number):string{
 if(kind!=='session'&&kind!=='community'&&kind!=='private'&&kind!=='team')throw Error('Conversa inválida.');
 if(!Number.isSafeInteger(conversationId)||conversationId<=0)throw Error('Conversa inválida.');
 return `/api/messages/polls/${kind}/${conversationId}`;
}
export async function pollResults(kind:ChatPollKind,conversationId:number,messageId:number,token:string|null):Promise<ChatPollResult|null>{
 if(DEMO_MODE||!token||!Number.isSafeInteger(messageId)||messageId<=0)return null;
 const rows=await request<ChatPollResult[]>(`${base(kind,conversationId)}?ids=${messageId}`,{token});
 return rows.find(row=>row.messageId===messageId)??null;
}
/** option null removes my vote. */
export async function votePoll(kind:ChatPollKind,conversationId:number,messageId:number,option:number|null,token:string|null):Promise<ChatPollResult>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para votar.');
 if(!Number.isSafeInteger(messageId)||messageId<=0)throw Error('Sondagem inválida.');
 const url=`${base(kind,conversationId)}/${messageId}`;
 return option===null?request<ChatPollResult>(url,{token,method:'DELETE'})
  :request<ChatPollResult>(url,{token,method:'PUT',body:{option}});
}
