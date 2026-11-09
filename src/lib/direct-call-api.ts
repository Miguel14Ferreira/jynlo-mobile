import {DEMO_MODE,request} from './api';

export type DirectCallMedia='voice'|'video';
export interface DirectCallAvailability {
 enabled:boolean;
 status:'ready'|'notConfigured'|'invalidCredentials'|'insufficientPermissions'|'providerUnavailable'|string;
}
export interface DirectCallInvitation {
 callId:string;
 caller:string;
 peer:string;
 media:DirectCallMedia;
 expiresAt:string;
}
export interface DirectCallSession {
 callId:string;
 peer:string;
 media:DirectCallMedia;
 serverUrl:string;
 token:string;
 expiresAt:string;
}
export interface DirectCallMembers {
 participants:{username:string;identity:string}[];
 pending:string[];
}
const PEER=/^[a-zA-Z0-9_.@-]{1,128}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function requireToken(token:string){
 if(DEMO_MODE||!token)throw Error('Inicia sessão para gerir chamadas.');
}
function callPath(id:string){
 if(!UUID.test(id))throw Error('Identificador de chamada inválido.');
 return '/api/calls/direct/'+id;
}
function validPeer(peer:string){
 if(!PEER.test(peer))throw Error('Contacto inválido.');
 return encodeURIComponent(peer);
}
/** Provider status does not grant permission to start or join a call. */
export async function directCallAvailability(token:string):Promise<DirectCallAvailability>{
 requireToken(token);
 return request<DirectCallAvailability>('/api/calls/direct/availability',{token});
}
/** The server returns invitation metadata only; never a media token. */
export async function pendingDirectCall(token:string):Promise<DirectCallInvitation|null>{
 requireToken(token);
 return request<DirectCallInvitation|null>('/api/calls/direct/pending',{token});
}
/** Do not use start/accept until native LiveKit media is integrated. No POST retries. */
export async function startDirectCall(peer:string,media:DirectCallMedia,token:string):Promise<DirectCallSession>{
 requireToken(token);
 if(media!=='voice'&&media!=='video')throw Error('Tipo de chamada inválido.');
 return request<DirectCallSession>('/api/calls/direct/'+validPeer(peer),{token,method:'POST',body:{media}});
}
export async function acceptDirectCall(callId:string,token:string):Promise<DirectCallSession>{
 requireToken(token);
 return request<DirectCallSession>(callPath(callId)+'/accept',{token,method:'POST'});
}
export async function declineDirectCall(callId:string,token:string):Promise<void>{
 requireToken(token);
 await request<void>(callPath(callId)+'/decline',{token,method:'POST'});
}
export async function endDirectCall(callId:string,token:string):Promise<void>{
 requireToken(token);
 await request<void>(callPath(callId)+'/end',{token,method:'POST'});
}
export async function directCallMembers(callId:string,token:string):Promise<DirectCallMembers>{
 requireToken(token);
 return request<DirectCallMembers>(callPath(callId)+'/members',{token});
}
export async function inviteDirectCallMember(callId:string,username:string,token:string):Promise<void>{
 requireToken(token);
 await request<void>(callPath(callId)+'/invite/'+validPeer(username),{token,method:'POST'});
}
