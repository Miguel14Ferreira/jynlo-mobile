import {DEMO_MODE,request} from './api';
import {notifyDemoCommunityMessage} from './community-realtime';
import {communityDetails,myCommunities} from './community-api';
import {mySessions} from './parity-api';
import type {CommunityChatEntry,JynloInboxSummary} from './types';
import {safeId} from './community-core.cjs';
import {filterAuthorizedSummaries,filterAuthorizedDirectSummaries} from './authorized-inbox-summaries.cjs';
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
export async function sendCommunityMessage(id:number,body:string,token:string,username:string,replyToMessageId?:number|null):Promise<CommunityChatEntry>{
 await member(id,token,username);const text=body.trim();
 if(replyToMessageId!=null&&(!Number.isSafeInteger(replyToMessageId)||replyToMessageId<=0))throw Error('Mensagem citada inválida.');
 if(!text||text.length>4000)throw Error('Escreve uma mensagem até 4000 caracteres.');
 if(DEMO_MODE){
  const history=threads.get(safeId(id))||[];
  const quoted=replyToMessageId!=null?history.find(entry=>entry.id===replyToMessageId&&!entry.deletedAt):null;
  if(replyToMessageId!=null&&!quoted)throw Error('A mensagem citada já não está disponível nesta comunidade.');
  const msg:CommunityChatEntry={id:++nextId,communityId:id,kind:'CHAT',username,body:text,
   createdAt:new Date().toISOString(),replyToMessageId:quoted?.id??null,
   replyToSender:quoted?.username??null,replyToText:quoted?.body??null};
  threads.set(safeId(id),[...history,msg]);notifyDemoCommunityMessage(msg);return msg;}
 // Never repeat this POST after a timeout without verifying history.
 return request<CommunityChatEntry>(base(id),{token,method:'POST',body:{body:text,...(replyToMessageId!=null?{replyToMessageId}:{})}});
}
/** Mutations are authorized server-side. Never infer that a failed POST/PUT succeeded. */
export async function editCommunityChatMessage(id:number,messageId:number,text:string,token:string,username:string):Promise<CommunityChatEntry>{
 await member(id,token,username);
 if(!Number.isSafeInteger(messageId)||messageId<=0)throw Error('Mensagem inválida.');
 const body=text.trim();
 if(!body||body.length>2000||body.startsWith('[JYNLO:GIPHY:1]'))throw Error('A mensagem editada deve ter entre 1 e 2000 caracteres.');
 if(DEMO_MODE){
  const history=threads.get(safeId(id))||[],existing=history.find(item=>item.id===messageId);
  if(!existing||existing.username.toLowerCase()!==username.toLowerCase()||existing.deletedAt||
      existing.attachmentName||!Number.isFinite(Date.parse(existing.createdAt))||
      Date.now()-Date.parse(existing.createdAt)>15*60*1000)
   throw Error('Esta mensagem já não pode ser editada.');
  const updated={...existing,body,editedAt:new Date().toISOString()};
  threads.set(safeId(id),history.map(item=>item.id===messageId?updated:item));
  notifyDemoCommunityMessage(updated);return updated;
 }
 return request<CommunityChatEntry>(base(id)+'/'+messageId,{
  token,method:'PUT',body:{text:body}
 });
}
export async function deleteCommunityChatMessageForEveryone(id:number,messageId:number,token:string,username:string):Promise<CommunityChatEntry>{
 await member(id,token,username);
 if(!Number.isSafeInteger(messageId)||messageId<=0)throw Error('Mensagem inválida.');
 if(DEMO_MODE){
  const history=threads.get(safeId(id))||[],existing=history.find(item=>item.id===messageId);
  if(!existing||existing.username.toLowerCase()!==username.toLowerCase()||existing.deletedAt)
   throw Error('Não é possível eliminar esta mensagem.');
  const updated={...existing,body:'',deletedAt:new Date().toISOString()};
  threads.set(safeId(id),history.map(item=>item.id===messageId?updated:
   item.replyToMessageId===messageId?{...item,replyToText:'Mensagem removida'}:item));
  notifyDemoCommunityMessage(updated);return updated;
 }
 return request<CommunityChatEntry>(base(id)+'/'+messageId+'/for-everyone',{
  token,method:'DELETE'
 });
}
export async function communityInbox(token:string,username:string):Promise<JynloInboxSummary[]>{
 if(!token||!username)throw Error('Inicia sessão para continuar.');
 const groups=await myCommunities(token,username);
 if(DEMO_MODE)return groups.map(c=>{
  const last=threads.get(c.id)?.at(-1);
  return{kind:'community' as const,id:String(c.id),title:c.name?.trim()||'Comunidade',latestMessageId:last?.id??null,latestText:last?.body??null,
   latestSender:last?.username??null,latestAt:last?.createdAt??null,unreadCount:(threads.get(c.id)||[]).filter(m=>m.username!==username&&m.id>(demoRead.get(username+':'+c.id)||0)).length};
 });
 if(groups.length===0)return [];
 // Avoid duplicate conversations when membership lists contain repeated records.
 const seenIds=new Set<number>();
 const uniqueGroups=groups.filter(c=>{
  if(!Number.isSafeInteger(c.id)||c.id<=0||seenIds.has(c.id))return false;
  seenIds.add(c.id);
  return true;
 });
 // Keep inbox summary requests bounded, as for direct conversations.
 const summaries:JynloInboxSummary[]=[];
 for(let i=0;i<uniqueGroups.length;i+=100){
  const batch=await request<JynloInboxSummary[]>('/api/messages/inbox/summaries',{
   token,method:'POST',body:{conversations:uniqueGroups.slice(i,i+100).map(c=>({kind:'community',id:String(c.id)}))}
  });
  if(!Array.isArray(batch))throw Error('Resposta de conversas inválida. Atualiza para voltar a consultar.');
  summaries.push(...batch);
 }
 // Only the authenticated membership list determines visible communities.
 const allowed=new Map(uniqueGroups.map(group=>[String(group.id),group.name?.trim()||'Comunidade']));
 return filterAuthorizedSummaries('community',allowed,summaries,'Comunidade');
}

/** Build the session inbox only from sessions the logged-in account created or joined.
 * Waitlisted users do not have chat access. The API still checks membership.
 */
export async function sessionInbox(token:string,username:string):Promise<JynloInboxSummary[]>{
 if(!token||!username)throw Error('Inicia sessão para consultar as conversas de sessões.');
 const mine=await mySessions(token,username);
 const allowed=new Map<string,string>();
 for(const session of [...mine.created,...mine.joined]){
  if(!Number.isSafeInteger(session.id)||session.id<=0)continue;
  if(['CANCELLED','COMPLETED'].includes(session.status))continue;
  const sport=typeof session.sport==='string'?session.sport.trim():'';
  const city=typeof session.city==='string'?session.city.trim():'';
  allowed.set(String(session.id),[sport,city].filter(Boolean).join(' · ')||'Sessão desportiva');
 }
 const ids=[...allowed.keys()];
 if(ids.length===0)return [];
 if(DEMO_MODE)return ids.map(id=>({kind:'session' as const,id,title:allowed.get(id)||'Sessão desportiva',latestMessageId:null,
  latestText:null,latestSender:null,latestAt:null,unreadCount:0}));
 const summaries:JynloInboxSummary[]=[];
 for(let i=0;i<ids.length;i+=100){
  const batch=await request<JynloInboxSummary[]>('/api/messages/inbox/summaries',{
   token,method:'POST',body:{conversations:ids.slice(i,i+100).map(id=>({kind:'session',id}))}
  });
  if(!Array.isArray(batch))throw Error('Resposta de conversas inválida. Atualiza para voltar a consultar.');
  summaries.push(...batch);
 }
 // The server omits closed/revoked chats; never synthesize those entries.
 return filterAuthorizedSummaries('session',allowed,summaries,'Sessão desportiva')
  .sort((a,b)=>(Date.parse(b.latestAt||'')||0)-(Date.parse(a.latestAt||'')||0));
}

/** Server-verified read cursor. Only acknowledge messages actually displayed. */
export async function markCommunityRead(id:number,lastSeenMessageId:number,token:string,username:string):Promise<void>{
 await member(id,token,username);
 if(!Number.isSafeInteger(lastSeenMessageId)||lastSeenMessageId<=0)return;
 if(DEMO_MODE){const k=username+':'+id;demoRead.set(k,Math.max(demoRead.get(k)||0,lastSeenMessageId));return;}
 await request('/api/messages/inbox/read',{token,method:'PUT',body:{kind:'community',id:String(id),lastSeenMessageId}});
}
const demoRead=new Map<string,number>();

/** Private conversations belong to the signed-in account. The server filters
 * removed/blocked peers before returning them; never infer conversations from a public profile.
 */
export interface DirectChatEntry {
 id:number;username1:string;username2:string;text:string|null;date:string|null;
 replyToMessageId?:number|null;replyToSender?:string|null;replyToText?:string|null;
 editedAt?:string|null;deletedAt?:string|null;
 attachmentName?:string|null;attachmentMimeType?:string|null;attachmentSize?:number|null;
 attachments?:Array<{index:number;filename:string;mimeType:string;size:number}>|null;
}
export async function directConversationPeers(token:string):Promise<string[]>{
 if(!token||DEMO_MODE)return [];
 return request<string[]>('/api/chat/me/peers',{token});
}
export async function directInbox(token:string):Promise<JynloInboxSummary[]>{
 const rawPeers=await directConversationPeers(token);
 if(!Array.isArray(rawPeers))throw Error('Lista de conversas privadas inválida.');
 // The backend can return duplicate peers with different letter casing.
 // Never let a malformed peer invalidate the entire inbox request.
 const seen=new Set<string>();
 const peers=rawPeers.filter(peer=>{
  if(typeof peer!=='string'||!/^[a-zA-Z0-9_.@-]{1,128}$/.test(peer))return false;
  const key=peer.toLowerCase();
  if(seen.has(key))return false;
  seen.add(key);
  return true;
 });
 if(!peers.length)return [];
 const summaries:JynloInboxSummary[]=[];
 for(let i=0;i<peers.length;i+=100){
  const batch=await request<JynloInboxSummary[]>('/api/messages/inbox/summaries',{
   token,method:'POST',body:{conversations:peers.slice(i,i+100).map(id=>({kind:'direct',id}))}
  });
  if(!Array.isArray(batch))throw Error('Resposta de conversas inválida. Atualiza para voltar a consultar.');
  summaries.push(...batch);
 }
 // Only the verified peer list grants access. Invalid or unlisted summaries
 // cannot create conversations or alter the display of authorized peers.
 const authorized=new Map(peers.map(peer=>[peer.toLowerCase(),peer]));
 return filterAuthorizedDirectSummaries(authorized,summaries)
  .sort((a,b)=>(Date.parse(b.latestAt||'')||0)-(Date.parse(a.latestAt||'')||0));
}
export async function directChatHistory(peer:string,token:string):Promise<DirectChatEntry[]>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para ver as mensagens privadas.');
 if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(peer))throw Error('Conversa inválida.');
 return request<DirectChatEntry[]>('/api/chat/me/'+encodeURIComponent(peer),{token});
}
export async function sendDirectChat(peer:string,text:string,token:string):Promise<DirectChatEntry>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para enviar mensagens.');
 if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(peer))throw Error('Conversa inválida.');
 const body=text.trim();
 if(!body||body.length>2000)throw Error('Escreve uma mensagem até 2000 caracteres.');
 // Do not automatically repeat an uncertain POST, to avoid duplicated messages.
 return request<DirectChatEntry>('/api/chat/me/'+encodeURIComponent(peer),{
  token,method:'POST',body:{text:body}
 });
}
/** Reply within an authorized conversation; the backend checks the quoted message. */
export async function sendDirectChatReply(peer:string,text:string,token:string,replyToMessageId:number):Promise<DirectChatEntry>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para responder.');
 if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(peer))throw Error('Conversa inválida.');
 if(!Number.isSafeInteger(replyToMessageId)||replyToMessageId<=0)throw Error('Mensagem original inválida.');
 const body=text.trim();
 if(!body||body.length>2000)throw Error('Escreve uma mensagem até 2000 caracteres.');
 return request<DirectChatEntry>('/api/chat/me/'+encodeURIComponent(peer),{
  token,method:'POST',body:{text:body,replyToMessageId}
 });
}
/** Edit only your own recent text messages; backend rechecks author and 15-minute policy. */
export async function editDirectChatMessage(peer:string,messageId:number,text:string,token:string):Promise<DirectChatEntry>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para editar mensagens.');
 if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(peer)||!Number.isSafeInteger(messageId)||messageId<=0)
  throw Error('Mensagem inválida.');
 const body=text.trim();
 if(!body||body.length>2000||body.startsWith('[JYNLO:GIPHY:1]'))
  throw Error('A mensagem editada deve ter entre 1 e 2000 caracteres.');
 return request<DirectChatEntry>('/api/chat/me/'+encodeURIComponent(peer)+'/messages/'+messageId,{
  token,method:'PUT',body:{text:body}
 });
}
/** Authorized soft delete; other participants see a redacted message. */
export async function deleteDirectChatMessage(peer:string,messageId:number,token:string):Promise<DirectChatEntry>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para apagar mensagens.');
 if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(peer)||!Number.isSafeInteger(messageId)||messageId<=0)
  throw Error('Mensagem inválida.');
 return request<DirectChatEntry>('/api/chat/me/'+encodeURIComponent(peer)+'/messages/'+messageId,{
  token,method:'DELETE'
 });
}
export async function markDirectRead(peer:string,lastSeenMessageId:number,token:string):Promise<void>{
 if(!token||DEMO_MODE||!Number.isSafeInteger(lastSeenMessageId)||lastSeenMessageId<=0)return;
 if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(peer))return;
 await request('/api/messages/inbox/read',{
  token,method:'PUT',body:{kind:'direct',id:peer.toLowerCase(),lastSeenMessageId}
 });
}
