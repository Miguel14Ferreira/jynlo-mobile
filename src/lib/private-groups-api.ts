import {DEMO_MODE,request} from './api';
import {validateGroupTitle,validateInvitees,validateGroupMessage,type PrivateGroup,type PrivateGroupMessage} from './private-groups-core.cjs';
const ROOT='/api/private-groups';
const gid=(id:number)=>{if(!Number.isSafeInteger(id)||id<=0)throw Error('Grupo inválido.');return id;};
const need=(token:string|null|undefined)=>{if(DEMO_MODE||!token)throw Error('Inicia sessão para usares as conversas de grupo.');return token;};
export async function myGroups(token:string):Promise<PrivateGroup[]>{
 if(DEMO_MODE||!token)return [];
 const r=await request<PrivateGroup[]>(ROOT,{token});return Array.isArray(r)?r:[];
}
export async function getGroup(id:number,token:string):Promise<PrivateGroup>{return request<PrivateGroup>(`${ROOT}/${gid(id)}`,{token:need(token)});}
/** Never retried automatically: an uncertain POST could create a second group. */
export async function createGroup(title:string,usernames:string[],me:string,token:string):Promise<PrivateGroup>{
 return request<PrivateGroup>(ROOT,{token:need(token),method:'POST',body:{title:validateGroupTitle(title),usernames:validateInvitees(usernames,me,1)}});
}
export async function addGroupMembers(group:PrivateGroup,usernames:string[],me:string,token:string):Promise<PrivateGroup>{
 return request<PrivateGroup>(`${ROOT}/${gid(group.id)}/members`,{token:need(token),method:'POST',
  body:{usernames:validateInvitees(usernames,me,group.members.length)}});
}
export async function renameGroup(id:number,title:string,token:string):Promise<PrivateGroup>{
 return request<PrivateGroup>(`${ROOT}/${gid(id)}`,{token:need(token),method:'PATCH',body:{title:validateGroupTitle(title)}});
}
/** Creator removes someone, or a member removes themselves (leave). */
export async function removeGroupMember(id:number,username:string,token:string):Promise<PrivateGroup|null>{
 if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(username))throw Error('Membro inválido.');
 return request<PrivateGroup|null>(`${ROOT}/${gid(id)}/members/${encodeURIComponent(username)}`,{token:need(token),method:'DELETE'});
}
export async function groupMessages(id:number,token:string,beforeId?:number|null):Promise<PrivateGroupMessage[]>{
 const q=beforeId&&Number.isSafeInteger(beforeId)&&beforeId>0?`?beforeId=${beforeId}`:'';
 const r=await request<PrivateGroupMessage[]>(`${ROOT}/${gid(id)}/messages${q}`,{token:need(token)});
 return Array.isArray(r)?r:[];
}
export async function sendGroupMessage(id:number,text:string,token:string,replyToId?:number|null):Promise<PrivateGroupMessage>{
 const reply=replyToId!=null&&Number.isSafeInteger(replyToId)&&replyToId>0?replyToId:null;
 return request<PrivateGroupMessage>(`${ROOT}/${gid(id)}/messages`,{token:need(token),method:'POST',body:{text:validateGroupMessage(text),replyToId:reply}});
}
export async function editGroupMessage(id:number,messageId:number,text:string,token:string):Promise<PrivateGroupMessage>{
 if(!Number.isSafeInteger(messageId)||messageId<=0)throw Error('Mensagem inválida.');
 return request<PrivateGroupMessage>(`${ROOT}/${gid(id)}/messages/${messageId}`,{token:need(token),method:'PUT',body:{text:validateGroupMessage(text)}});
}
export async function deleteGroupMessage(id:number,messageId:number,token:string):Promise<void>{
 if(!Number.isSafeInteger(messageId)||messageId<=0)throw Error('Mensagem inválida.');
 await request<void>(`${ROOT}/${gid(id)}/messages/${messageId}`,{token:need(token),method:'DELETE'});
}
/** Whether private file storage is on; members only. */
export async function groupAttachmentsAvailable(id:number,token:string):Promise<boolean>{
 const r=await request<{available?:boolean}>(`${ROOT}/${gid(id)}/messages/attachments/availability`,{token:need(token)});
 return r?.available===true;
}
