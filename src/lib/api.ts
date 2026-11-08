import { demoCancel, demoDetail, demoInvitePlayer, demoInvites, demoJoin, demoLeave, demoParticipants, demoPreview, demoRespondInvite, demoSessions } from './demo';
import {readSuccessfulResponse} from './response-body.cjs';
import type { JoinSessionResponse, LoginResponse, PublicSessionPreview, SessionDetail, SessionFilters, SessionParticipant, SessionSummary, PendingSessionInvite, SessionTeamSuggestion } from './types';

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
export async function request<T>(path:string, {token,method='GET',body}:{token?:string|null;method?:'GET'|'POST'|'PUT'|'PATCH'|'DELETE';body?:unknown}={}):Promise<T>{
  if (DEMO_MODE) throw new Error('Os pedidos HTTP estão desativados na demonstração.');
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(),12000);
  try {
    const response = await fetch(`${API_BASE}${path}`,{
      // Android authenticates exclusively with bearer tokens; never persist browser refresh cookies.
      method, signal:controller.signal, credentials:'omit',
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
    // Some successful DELETE/POST endpoints return 200 with an empty body.
    // Never misreport a completed mutation as a network failure just because JSON is absent.
    return (await readSuccessfulResponse(response)) as T;
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
/** Organizer-only removal of an ACTIVE session membership.
 * Server authorizes the creator, preserves waitlist promotion, and invalidates old team assignments.
 * An uncertain DELETE response must never be retried automatically.
 */
/** Record actual post-game attendance. This is an organizer-only action on the server.
 * Never retry an uncertain PUT automatically; check authoritative roster first.
 */
export async function recordSessionAttendance(
 sessionId:number,participantId:number,token:string,status:'ATTENDED'|'NO_SHOW'
):Promise<void>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para registar presenças.');
 if(!Number.isSafeInteger(sessionId)||sessionId<=0||
    !Number.isSafeInteger(participantId)||participantId<=0)
  throw Error('Identificador de sessão ou participante inválido.');
 if(status!=='ATTENDED'&&status!=='NO_SHOW')throw Error('Estado de presença inválido.');
 await request<void>(`/api/sessions/${sessionId}/participants/${participantId}/attendance`,{
  token,method:'PUT',body:{status}
 });
}

export async function removeSessionParticipant(sessionId:number,participantId:number,token:string):Promise<void>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para gerir participantes.');
 if(!Number.isSafeInteger(sessionId)||sessionId<=0||
    !Number.isSafeInteger(participantId)||participantId<=0)
  throw Error('Identificador de sessão ou participante inválido.');
 await request<void>(`/api/sessions/${sessionId}/participants/${participantId}`,{token,method:'DELETE'});
}

export async function openSessionRegistration(id:number,token:string):Promise<SessionDetail>{
  if(DEMO_MODE)throw new Error('A abertura manual não está disponível nesta demonstração.');
  return request<SessionDetail>(`/api/sessions/${id}/registration/open`,{token,method:'POST',body:null});
}
/** Organizer-only changes. Never retry PATCH after an uncertain network failure. */
export async function updateSessionMeetingPoint(id:number,token:string,instructions:string):Promise<SessionDetail>{
 if(!Number.isSafeInteger(id)||id<=0||!token||DEMO_MODE)throw Error('Inicia sessão para gerir o ponto de encontro.');
 if(instructions.length>240||/[\\r\\n\\x00-\\x1f\\x7f]/.test(instructions))
  throw Error('As instruções devem ter uma única linha até 240 caracteres.');
 return request<SessionDetail>(`/api/sessions/${id}/meeting-point`,{
  token,method:'PATCH',body:{meetingPointInstructions:instructions.trim()||null}
 });
}
export async function updateSessionExternalConfirmations(id:number,token:string,count:number):Promise<SessionDetail>{
 if(!Number.isSafeInteger(id)||id<=0||!token||DEMO_MODE)throw Error('Inicia sessão para gerir os jogadores.');
 if(!Number.isInteger(count)||count<0||count>99)throw Error('Indica entre 0 e 99 jogadores confirmados externamente.');
 return request<SessionDetail>(`/api/sessions/${id}/external-confirmations`,{
  token,method:'PATCH',body:{externalConfirmedParticipants:count}
 });
}

/** Only organizers are authorized by the backend. GET is a preview; POST persists team assignment. */
export async function suggestSessionTeams(id:number,token:string,source:'FORM'|'EXCEL_POINTS'|'RANDOM'):Promise<SessionTeamSuggestion>{
 if(!Number.isSafeInteger(id)||id<=0||!token||DEMO_MODE)throw Error('Inicia sessão para consultar equipas.');
 return request<SessionTeamSuggestion>(`/api/sessions/${id}/teams/suggestion?source=${source}`,{token});
}
export async function confirmSessionTeams(id:number,token:string,source:'FORM'|'EXCEL_POINTS'):Promise<SessionTeamSuggestion>{
 if(!Number.isSafeInteger(id)||id<=0||!token||DEMO_MODE)throw Error('Inicia sessão para confirmar equipas.');
 return request<SessionTeamSuggestion>(`/api/sessions/${id}/teams/confirm?source=${source}`,{
  token,method:'POST',...(source==='RANDOM'?{body:{teamA:preview?.teamA.map(p=>p.username)??[],teamB:preview?.teamB.map(p=>p.username)??[]}}:{})
 });
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
