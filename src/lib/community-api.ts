import {ApiError,DEMO_MODE,request} from './api';
import type {
  CommunityCreationQuota,CommunityCreateRequest,CommunityGroup,CommunityInvite,
  CommunityJoinRequest,CommunitySearchResponse,CommunitySummary,SessionSummary
} from './types';
import {makeStore,normalizeCommunityInput,safeId} from './community-core.cjs';
import {demoSessions} from './demo';

const demo=makeStore();
const root='/api/communities';
const uid=(id:number)=>safeId(id);
function auth(token:string|null|undefined,username?:string|null){
  if(!token||!username) throw new Error('Inicia sessão para continuar.');
  return username;
}
function q(v:string){return encodeURIComponent(v.trim());}
export async function searchCommunities(name='',sport='',page=0):Promise<CommunitySearchResponse>{
  if(DEMO_MODE)return demo.search(name,sport,page) as CommunitySearchResponse;
  return request<CommunitySearchResponse>(`${root}/search?name=${q(name)}&sport=${q(sport)}&page=${Math.max(0,Math.floor(page))}`);
}
export async function myCommunities(token:string,username:string):Promise<CommunityGroup[]>{
  if(DEMO_MODE)return demo.mine(auth(token,username)) as CommunityGroup[];
  return request<CommunityGroup[]>(`${root}/mine`,{token});
}
export async function communityDetails(id:number,token?:string|null,username?:string|null):Promise<CommunityGroup|CommunitySummary>{
  if(DEMO_MODE) return demo.get(uid(id),username) as CommunityGroup;
  if(token){
    try{return await request<CommunityGroup>(`${root}/${uid(id)}`,{token});}
    catch(e){if(!(e instanceof ApiError)||e.status!==403)throw e;}
  }
  // Non-members only receive the limited presentation DTO; never load private roster.
  return request<CommunitySummary>(`${root}/${uid(id)}/presentation`);
}
export async function creationQuota(token:string,username:string):Promise<CommunityCreationQuota>{
  if(DEMO_MODE)return demo.quota(auth(token,username));
  return request<CommunityCreationQuota>(`${root}/creation-quota`,{token});
}
export async function createCommunity(input:CommunityCreateRequest,token:string,username:string):Promise<CommunityGroup>{
  auth(token,username);const payload=normalizeCommunityInput(input);
  if(DEMO_MODE)return demo.create(payload,username) as CommunityGroup;
  return request<CommunityGroup>(root,{token,method:'POST',body:payload});
}
export type CommunityFollowState={count:number;following:boolean};
/** Following a public community does NOT join its private member chat. */
export async function communityFollowState(id:number,token:string,username:string):Promise<CommunityFollowState>{
  auth(token,username);
  if(DEMO_MODE)return {count:0,following:false};
  return request<CommunityFollowState>(`${root}/${uid(id)}/followers`,{token});
}
export async function setCommunityFollow(id:number,token:string,username:string,following:boolean):Promise<CommunityFollowState>{
  auth(token,username);
  if(DEMO_MODE)throw new Error('Seguir comunidades não está disponível no modo de demonstração.');
  return request<CommunityFollowState>(`${root}/${uid(id)}/followers/me`,
    {token,method:following?'PUT':'DELETE',body:following?{}:undefined});
}
export async function joinPublicCommunity(id:number,token:string,username:string):Promise<CommunityGroup>{
  auth(token,username);if(DEMO_MODE)return demo.joinPublic(uid(id),username) as CommunityGroup;
  return request<CommunityGroup>(`${root}/${uid(id)}/join`,{token,method:'POST',body:null});
}
export async function requestCommunityMembership(id:number,token:string,username:string):Promise<CommunityJoinRequest>{
  auth(token,username);if(DEMO_MODE)return demo.requestJoin(uid(id),username) as CommunityJoinRequest;
  return request<CommunityJoinRequest>(`${root}/${uid(id)}/join-requests`,{token,method:'POST',body:null});
}
export async function myPendingCommunityRequest(id:number,token:string,username:string):Promise<CommunityJoinRequest|null>{
  auth(token,username);if(DEMO_MODE)return demo.myPendingRequest(uid(id),username) as CommunityJoinRequest|null;
  return request<CommunityJoinRequest|null>(`${root}/${uid(id)}/join-requests/me`,{token});
}
export async function pendingCommunityRequests(id:number,token:string,username:string):Promise<CommunityJoinRequest[]>{
  auth(token,username);if(DEMO_MODE)return demo.pendingRequests(uid(id),username) as CommunityJoinRequest[];
  return request<CommunityJoinRequest[]>(`${root}/${uid(id)}/join-requests`,{token});
}
export async function acceptCommunityRequest(id:number,requestId:number,token:string,username:string):Promise<CommunityGroup>{
  auth(token,username);if(DEMO_MODE)return demo.acceptRequest(uid(id),uid(requestId),username) as CommunityGroup;
  return request<CommunityGroup>(`${root}/${uid(id)}/join-requests/${uid(requestId)}/accept`,{token,method:'POST',body:null});
}
export async function inviteCommunityMember(id:number,toUsername:string,token:string,username:string):Promise<CommunityInvite>{
  auth(token,username);const user=toUsername.trim();if(user.length<2||user.length>80)throw new Error('Indica um utilizador válido.');
  if(DEMO_MODE)return demo.invite(uid(id),user,username) as CommunityInvite;
  return request<CommunityInvite>(`${root}/${uid(id)}/invites`,{token,method:'POST',body:{username:user}});
}
export async function myCommunityInvites(token:string,username:string):Promise<CommunityInvite[]>{
  auth(token,username);if(DEMO_MODE)return demo.myInvites(username) as CommunityInvite[];
  return request<CommunityInvite[]>(`${root}/invites/me`,{token});
}
export async function respondCommunityInvite(inviteId:number,action:'accept'|'reject',token:string,username:string):Promise<CommunityGroup|void>{
  auth(token,username);if(DEMO_MODE){
    if(action==='accept')return demo.acceptInvite(uid(inviteId),username) as CommunityGroup;
    demo.rejectInvite(uid(inviteId),username);return;
  }
  return request<CommunityGroup|void>(`${root}/invites/${uid(inviteId)}/${action}`,{token,method:'POST',body:null});
}
export async function communitySessions(id:number,token:string,username:string):Promise<SessionSummary[]>{
  auth(token,username);if(DEMO_MODE)return uid(id)===930001?demoSessions({sport:'Futebol'},username).slice(0,1):[];
  return request<SessionSummary[]>(`${root}/${uid(id)}/sessions`,{token});
}

/** Owner/admin only (server-verified): members-only session also shown to other players, or back to members only. */
export async function setCommunitySessionAudience(communityId:number,sessionId:number,toPublic:boolean,token:string):Promise<SessionSummary>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para gerir a comunidade.');
 if(!Number.isSafeInteger(communityId)||communityId<=0||!Number.isSafeInteger(sessionId)||sessionId<=0)throw Error('Sessão inválida.');
 return request<SessionSummary>(`/api/communities/${communityId}/sessions/${sessionId}/${toPublic?'open-public':'restrict-members'}`,{token,method:'POST'});
}
