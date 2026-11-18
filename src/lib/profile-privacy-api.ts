import {DEMO_MODE,request} from './api';

export type ProfilePrivacyStatus={
 privateProfile:boolean;canViewContent:boolean;privateModeAvailable:boolean;
};
export type PrivateMediaReadiness={publicReferences:number;protectedReferences:number;databaseReferencesReady:boolean};
/** Personal media inventory counts only; does not expose public URLs or storage keys. */
export async function myPrivateMediaReadiness(token:string):Promise<PrivateMediaReadiness>{
 if(!token||DEMO_MODE)throw new Error('Inicia sessão para verificar a privacidade.');
 return request<PrivateMediaReadiness>('/api/profile/privacy/me/media-readiness',{token});
}
export type PendingFollowRequest={
 id:number;username:string;name:string|null;avatarUrl:string|null;createdAt:string;
};
/** Privacy decisions are always enforced by the server, never by local UI flags. */
export async function myProfilePrivacy(token:string):Promise<ProfilePrivacyStatus>{
 if(!token||DEMO_MODE)throw new Error('Inicia sessão para consultar a privacidade.');
 return request<ProfilePrivacyStatus>('/api/profile/privacy/me',{token});
}
export async function updateProfilePrivacy(token:string,privateProfile:boolean):Promise<ProfilePrivacyStatus>{
 if(!token||DEMO_MODE)throw new Error('Inicia sessão para alterar a privacidade.');
 return request<ProfilePrivacyStatus>('/api/profile/privacy/me',{token,method:'PUT',body:{privateProfile}});
}
export async function pendingFollowRequests(token:string):Promise<PendingFollowRequest[]>{
 if(!token||DEMO_MODE)return [];
 return request<PendingFollowRequest[]>('/api/profile/privacy/me/requests',{token});
}
export async function decideFollowRequest(token:string,id:number,accept:boolean):Promise<void>{
 if(!token||DEMO_MODE||!Number.isSafeInteger(id)||id<=0)throw new Error('Pedido de seguimento inválido.');
 await request<void>(`/api/profile/privacy/me/requests/${id}/${accept?'accept':'reject'}`,{token,method:'POST',body:{}});
}
export async function profilePrivacyStatus(token:string,username:string):Promise<ProfilePrivacyStatus>{
 if(!token||DEMO_MODE)throw new Error('Inicia sessão para consultar a privacidade.');
 return request<ProfilePrivacyStatus>('/api/profile/privacy/'+encodeURIComponent(username),{token});
}
export async function requestPrivateFollow(token:string,username:string):Promise<void>{
 if(!token||DEMO_MODE)throw new Error('Inicia sessão para seguir.');
 return request<void>('/api/profile/privacy/'+encodeURIComponent(username)+'/requests',{token,method:'POST',body:{}});
}
export async function cancelPrivateFollowRequest(token:string,username:string):Promise<void>{
 if(!token||DEMO_MODE)throw new Error('Inicia sessão para cancelar o pedido.');
 return request<void>('/api/profile/privacy/'+encodeURIComponent(username)+'/requests',{token,method:'DELETE'});
}
