import { demoCancel, demoDetail, demoInvitePlayer, demoInvites, demoJoin, demoLeave, demoParticipants, demoPreview, demoRespondInvite, demoSessions } from './demo';
import type { JoinSessionResponse, LoginResponse, PublicSessionPreview, SessionDetail, SessionFilters, SessionParticipant, SessionSummary, PendingSessionInvite } from './types';

/** Without an explicit environment override, the app is an isolated demo.
 * This avoids writing fictitious activity into Jynlo's real production backend. */
const configuredUrl = (process.env.EXPO_PUBLIC_JYNLO_API_URL || '').trim().replace(/\/+$/, '');
export const DEMO_MODE = !configuredUrl;
if (configuredUrl && !/^https:\/\/[^/]+$/.test(configuredUrl) && !/^http:\/\/localhost:\d+$/.test(configuredUrl)) {
  throw new Error('A API Jynlo requer HTTPS (ou localhost para desenvolvimento).');
}
export const API_BASE = configuredUrl;

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); this.name='ApiError'; }
}
export async function request<T>(path:string, {token,method='GET',body}:{token?:string|null;method?:'GET'|'POST'|'PUT'|'DELETE';body?:unknown}={}):Promise<T>{
  if (DEMO_MODE) throw new Error('Os pedidos HTTP estão desativados na demonstração.');
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(),12000);
  try {
    const response = await fetch(`${API_BASE}${path}`,{
      method, signal:controller.signal, credentials:'include',
      headers:{'Accept':'application/json',
        ...(body === undefined?{}:{'Content-Type':'application/json'}),
        ...(token?{'Authorization':`Bearer ${token}`}:{})},
      ...(body === undefined ? {} : {body:JSON.stringify(body)}),
    });
    if (!response.ok) {
      const fallback = response.status===401?'Inicia sessão para continuar.':
        response.status===403?'Não tens permissão para esta ação.':
        response.status===409?'Esta sessão já não aceita essa ação.':
        response.status===429?'Demasiados pedidos. Tenta mais tarde.':
        'Não foi possível concluir o pedido.';
      throw new ApiError(response.status,fallback);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }catch(error){
    if(error instanceof ApiError) throw error;
    if(controller.signal.aborted) throw new Error('A ligação demorou demasiado. Verifica o estado da sessão antes de repetir.');
    throw new Error('Falha de ligação à Jynlo. Verifica a rede e tenta novamente.');
  }finally{clearTimeout(timeout);}
}

function encodeFilters(filters:SessionFilters): string {
  const q = new URLSearchParams();
  if(filters.sport?.trim())q.set('sport',filters.sport.trim());
  if(filters.city?.trim())q.set('city',filters.city.trim());
  if(filters.availableOnly)q.set('availability','available');
  q.set('sort','date');
  return q.toString();
}
export async function discoverSessions(filters:SessionFilters,token?:string|null,username?:string):Promise<SessionSummary[]>{
  if(DEMO_MODE)return demoSessions(filters,username);
  return request<SessionSummary[]>(`/api/sessions?${encodeFilters(filters)}`,{token});
}
export async function sessionPreview(id:number):Promise<PublicSessionPreview>{
  if(DEMO_MODE)return demoPreview(id);
  return request<PublicSessionPreview>(`/api/sessions/${id}/public-preview`);
}
export async function sessionDetail(id:number,token:string,username?:string):Promise<SessionDetail>{
  if(DEMO_MODE)return demoDetail(id,username||'');
  return request<SessionDetail>(`/api/sessions/${id}`,{token});
}
export async function sessionParticipants(id:number,token:string):Promise<SessionParticipant[]>{
  if(DEMO_MODE)return demoParticipants(id);
  return request<SessionParticipant[]>(`/api/sessions/${id}/participants`,{token});
}
/** IMPORTANT: never automatically retry a POST on a connection timeout. */
export async function joinSession(id:number,token:string,username?:string,password?:string):Promise<JoinSessionResponse>{
  if(DEMO_MODE){ if(!username)throw new Error('Inicia sessão para participar.');return demoJoin(id,username); }
  return request<JoinSessionResponse>(`/api/sessions/${id}/join`,{token,method:'POST',body:{password:password?.trim()||null}});
}
/** Mutations are only issued by explicit user interaction. Never retry after a network timeout. */
export async function leaveSession(id:number,token:string,username?:string):Promise<void>{
  if(DEMO_MODE){if(!username)throw new Error('Inicia sessão.');demoLeave(id,username);return;}
  await request<void>(`/api/sessions/${id}/leave`,{token,method:'POST',body:null});
}
export async function cancelSession(id:number,token:string,username?:string):Promise<void>{
  if(DEMO_MODE){if(!username)throw new Error('Inicia sessão.');demoCancel(id,username);return;}
  await request<void>(`/api/sessions/${id}/cancel`,{token,method:'POST',body:null});
}
export async function openSessionRegistration(id:number,token:string):Promise<SessionDetail>{
  if(DEMO_MODE)throw new Error('A abertura manual não está disponível nesta demonstração.');
  return request<SessionDetail>(`/api/sessions/${id}/registration/open`,{token,method:'POST',body:null});
}
export async function pendingSessionInvites(token:string,username?:string):Promise<PendingSessionInvite[]>{
  if(DEMO_MODE)return username?demoInvites(username):[];
  return request<PendingSessionInvite[]>('/api/session-invites/pending',{token});
}
export async function inviteToSession(id:number,username:string,token:string,actor?:string):Promise<{id:number}>{
  if(DEMO_MODE)return demoInvitePlayer(id,actor||'',username.trim());
  return request<{id:number}>(`/api/sessions/${id}/invites`,{token,method:'POST',body:{username:username.trim()}});
}
export async function answerSessionInvite(sessionId:number,inviteId:number,accept:boolean,token:string,username?:string):Promise<JoinSessionResponse|void>{
  if(DEMO_MODE){if(!username)throw new Error('Inicia sessão.');return demoRespondInvite(sessionId,inviteId,username,accept);}
  return request<JoinSessionResponse|void>(`/api/sessions/${sessionId}/invites/${inviteId}/${accept?'accept':'decline'}`,{token,method:'POST',body:null});
}

export async function logoutServer(token:string):Promise<void>{
  if(DEMO_MODE)return;
  await request<void>('/api/auth/logout',{token,method:'POST',body:null});
}
export async function signIn(username:string,password:string):Promise<LoginResponse>{
  return request<LoginResponse>('/api/auth/login',{method:'POST',body:{username,password}});
}
export async function confirmMfa(challengeId:string,code:string):Promise<LoginResponse>{
  return request<LoginResponse>('/api/auth/mfa/confirm',{method:'POST',body:{challengeId,code}});
}

/** The backend enforces a 60-second cooldown; never retry automatically. */
export async function resendMfa(challengeId:string):Promise<LoginResponse>{
  return request<LoginResponse>('/api/auth/mfa/resend',{method:'POST',body:{challengeId}});
}
