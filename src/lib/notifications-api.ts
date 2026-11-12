import {DEMO_MODE,request} from './api';
import {myCommunityInvites} from './community-api';
import type {JynloNotification} from './types';
export async function myNotifications(token:string,username:string):Promise<JynloNotification[]>{
 if(!token||!username)throw Error('Inicia sessão para consultar notificações.');
 if(DEMO_MODE){const pending=await myCommunityInvites(token,username);
  return pending.map(i=>({id:i.id,subject:'Convite para comunidade',message:`${i.invitedByUsername} convidou-te para ${i.communityName}.`,createdAt:i.createdAt,read:false,type:'COMMUNITY_INVITE',communityId:i.communityId,sessionId:null}));}
 return request<JynloNotification[]>('/api/notifications/me',{token});
}
export async function markNotificationRead(id:number,token:string):Promise<void>{
 if(!Number.isSafeInteger(id)||id<=0)throw Error('Notificação inválida.');
 if(DEMO_MODE)return;
 await request<void>(`/api/notifications/${id}/read`,{token,method:'PUT',body:null});
}

/** Delete only the authenticated account's notification; server verifies ownership. */
export async function deleteMyNotification(id:number,token:string):Promise<void>{
 if(!token||!Number.isSafeInteger(id)||id<=0)throw Error('Notificação inválida.');
 if(DEMO_MODE)return;
 await request<void>(`/api/notifications/${id}`,{token,method:'DELETE'});
}
/** Irreversible bulk operation; caller must confirm with the user first. */
export async function deleteAllMyNotifications(token:string):Promise<void>{
 if(!token)throw Error('Inicia sessão para gerir as notificações.');
 if(DEMO_MODE)return;
 await request<void>('/api/notifications/me',{token,method:'DELETE'});
}
