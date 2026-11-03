import {DEMO_MODE,request} from './api';
import {notifyDemoCommunityMessage} from './community-realtime';
import {communityDetails,myCommunities} from './community-api';
import type {CommunityChatEntry,JynloInboxSummary} from './types';
import {safeId} from './community-core.cjs';
const threads=new Map<number,CommunityChatEntry[]>();let nextId=950000;
const base=(id:number)=>`/api/communities/${safeId(id)}/messages`;
async function member(id:number,token:string,username:string){
 if(!token||!username)throw Error('Inicia sessão para continuar.');
 if(DEMO_MODE){const c=await communityDetails(id,token,username);
   if(!('myRole' in c)||!c.myRole)throw Error('Só membros podem conversar nesta comunidade.');
 }
}
export async function communityMessages(id:number,token:string,username:string):Promise<CommunityChatEntry[]>{
 await member(id,token,username);
 if(DEMO_MODE)return [...(threads.get(safeId(id))||[])];
 return request<CommunityChatEntry[]>(base(id),{token});
}
export async function sendCommunityMessage(id:number,body:string,token:string,username:string):Promise<CommunityChatEntry>{
 await member(id,token,username);const text=body.trim();
 if(!text||text.length>4000)throw Error('Escreve uma mensagem até 4000 caracteres.');
 if(DEMO_MODE){const msg:CommunityChatEntry={id:++nextId,communityId:id,kind:'CHAT',username,body:text,createdAt:new Date().toISOString()};
  threads.set(safeId(id),[...(threads.get(id)||[]),msg]);notifyDemoCommunityMessage(msg);return msg;}
 // Never repeat this POST after a timeout without verifying history.
 return request<CommunityChatEntry>(base(id),{token,method:'POST',body:{body:text}});
}
export async function communityInbox(token:string,username:string):Promise<JynloInboxSummary[]>{
 if(!token||!username)throw Error('Inicia sessão para continuar.');
 const groups=await myCommunities(token,username);
 if(DEMO_MODE)return groups.map(c=>{
  const last=threads.get(c.id)?.at(-1);
  return{kind:'community' as const,id:String(c.id),latestMessageId:last?.id??null,latestText:last?.body??null,
   latestSender:last?.username??null,latestAt:last?.createdAt??null,unreadCount:(threads.get(c.id)||[]).filter(m=>m.username!==username&&m.id>(demoRead.get(username+':'+c.id)||0)).length};
 });
 if(groups.length===0)return [];
 return request<JynloInboxSummary[]>('/api/messages/inbox/summaries',{
  token,method:'POST',body:{conversations:groups.map(c=>({kind:'community',id:String(c.id)}))}
 });
}

/** Server-verified read cursor. Only acknowledge messages actually displayed. */
export async function markCommunityRead(id:number,lastSeenMessageId:number,token:string,username:string):Promise<void>{
 await member(id,token,username);
 if(!Number.isSafeInteger(lastSeenMessageId)||lastSeenMessageId<=0)return;
 if(DEMO_MODE){const k=username+':'+id;demoRead.set(k,Math.max(demoRead.get(k)||0,lastSeenMessageId));return;}
 await request('/api/messages/inbox/read',{token,method:'PUT',body:{kind:'community',id:String(id),lastSeenMessageId}});
}
const demoRead=new Map<string,number>();
