import {confirmedSessionJoin} from './session-join-receipt.cjs';
import { demoCancel, demoDetail, demoInvitePlayer, demoInvites, demoJoin, demoLeave, demoParticipants, demoPreview, demoRespondInvite, demoSessions } from './demo';
import {readSuccessfulResponse,InvalidSuccessfulResponseError} from './response-body.cjs';
import {validateApiOrigin} from './api-origin.cjs';
import type { JoinSessionResponse, LoginResponse, PublicSessionPreview, SessionDetail, SessionFilters, SessionParticipant, SessionSummary, PendingSessionInvite, SessionTeamSuggestion } from './types';

/** Without an explicit environment override, the app is an isolated demo.
 * This avoids writing fictitious activity into Jynlo's real production backend. */
const rawApiUrl = (process.env.EXPO_PUBLIC_JYNLO_API_URL || '').trim();
export const DEMO_MODE = !rawApiUrl;
export const API_BASE: string = rawApiUrl ? validateApiOrigin(rawApiUrl,{allowLocalhost:__DEV__}) : '';

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
      // Never follow an unexpected redirect while a bearer token is attached.
      // Authenticated API responses must not be persisted by HTTP caches.
      redirect:'error', cache:'no-store',
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
    if(error instanceof ApiError || error instanceof InvalidSuccessfulResponseError) throw error;
    if(controller.signal.aborted) throw new Error('A ligação demorou demasiado. Verifica o estado da sessão antes de repetir.');
    throw new Error('Falha de ligação à Jynlo. Verifica a rede e tenta novamente.');
  }finally{clearTimeout(timeout);}
}

function encodeFilters(filters:SessionFilters): string {
  const q = new URLSearchParams();
  if(filters.sport?.trim())q.set('sport',filters.sport.trim());
  if(filters.city?.trim())q.set('city',filters.city.trim());
  if(filters.availableOnly)q.set('availability','available');
  if(filters.skillLevel&&['BEGINNER','INTERMEDIATE','ADVANCED'].includes(filters.skillLevel))q.set('skillLevel',filters.skillLevel);
  const hasMapArea=typeof filters.latitude==='number'&&typeof filters.longitude==='number'&&typeof filters.radiusKm==='number'
    &&Number.isFinite(filters.latitude)&&Number.isFinite(filters.longitude)&&Number.isFinite(filters.radiusKm)
    &&Math.abs(filters.latitude)<=90&&Math.abs(filters.longitude)<=180
    &&filters.radiusKm>=5&&filters.radiusKm<=500;
  if(hasMapArea){
    q.set('latitude',String(filters.latitude));
    q.set('longitude',String(filters.longitude));
    q.set('radiusKm',String(filters.radiusKm));
  }
  q.set('sort',filters.sort==='distance'&&hasMapArea?'distance':'date');
  return q.toString();
}
export async function discoverSessions(filters:SessionFilters,token?:string|null,username?:string):Promise<SessionSummary[]>{
  if(DEMO_MODE)return demoSessions(filters,username);
  // Explorar keeps its last good list (per account) to show when there is no connection.
  const {withOfflineSnapshot}=await import('./offline-cache');
  return withOfflineSnapshot('explore',username||'visitor',()=>request<SessionSummary[]>(`/api/sessions?${encodeFilters(filters)}`,{token}));
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
  if(!Number.isSafeInteger(id)||id<=0||!token)throw Error('Sessão ou autenticação inválida.');
  if(DEMO_MODE&&!username)throw Error('Inicia sessão para participar.');
  const result=DEMO_MODE?demoJoin(id,username!):
    await request<JoinSessionResponse>(`/api/sessions/${id}/join`,{token,method:'POST',body:{password:password?.trim()||null}});
  if(!confirmedSessionJoin(result))
    throw Error('O servidor respondeu, mas não confirmou a participação. Atualiza os jogadores antes de repetir.');
  return result;
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
 if(instructions.length>240||/[\r\n\x00-\x1f\x7f]/.test(instructions))
  throw Error('As instruções devem ter uma única linha até 240 caracteres.');
 return request<SessionDetail>(`/api/sessions/${id}/meeting-point`,{
  token,method:'PATCH',body:{meetingPointInstructions:instructions.trim()||null}
 });
}
/** Organizer-only: level of the session (null = all levels). Never retried automatically. */
export async function updateSessionSkillLevel(id:number,token:string,skillLevel:'BEGINNER'|'INTERMEDIATE'|'ADVANCED'|null):Promise<SessionDetail>{
 if(!Number.isSafeInteger(id)||id<=0||!token||DEMO_MODE)throw Error('Inicia sessão para gerir o nível da sessão.');
 if(skillLevel!==null&&!['BEGINNER','INTERMEDIATE','ADVANCED'].includes(skillLevel))throw Error('Nível inválido.');
 return request<SessionDetail>(`/api/sessions/${id}/skill-level`,{token,method:'PATCH',body:{skillLevel}});
}
/** Organizer-only, after kick-off. NOT_OCCURRED cancels the session on the server. Never retried. */
export async function reportSessionProblem(id:number,token:string,type:'NOT_OCCURRED'|'VENUE_PROBLEM'|'OTHER',details:string):Promise<void>{
 if(!Number.isSafeInteger(id)||id<=0||!token||DEMO_MODE)throw Error('Inicia sessão para reportar um problema.');
 if(!['NOT_OCCURRED','VENUE_PROBLEM','OTHER'].includes(type))throw Error('Escolhe o que aconteceu.');
 const note=details.replace(/[\u0000-\u001F\u007F]/g,' ').trim();
 if(note.length>500)throw Error('Os detalhes podem ter até 500 caracteres.');
 if(type==='OTHER'&&!note)throw Error('Explica brevemente o que aconteceu.');
 await request<void>(`/api/sessions/${id}/problems`,{token,method:'POST',body:{type,details:note||null}});
}
export async function updateSessionExternalConfirmations(id:number,token:string,count:number):Promise<SessionDetail>{
 if(!Number.isSafeInteger(id)||id<=0||!token||DEMO_MODE)throw Error('Inicia sessão para gerir os jogadores.');
 if(!Number.isInteger(count)||count<0||count>99)throw Error('Indica entre 0 e 99 jogadores confirmados externamente.');
 return request<SessionDetail>(`/api/sessions/${id}/external-confirmations`,{
  token,method:'PATCH',body:{externalConfirmedParticipants:count}
 });
}

/** Actual stored ranking sources, checked by the backend for the current organizer. */
export interface SessionTeamOptions {
 randomAvailable:boolean;
 communityRankingAvailable:boolean;
 excelRankingAvailable:boolean;
}
export async function sessionTeamOptions(id:number,token:string):Promise<SessionTeamOptions>{
 if(!Number.isSafeInteger(id)||id<=0||!token||DEMO_MODE)
  throw Error('Inicia sessão para verificar as classificações.');
 return request<SessionTeamOptions>(`/api/sessions/${id}/teams/options`,{token});
}

/** Only organizers are authorized by the backend. GET is a preview; POST persists team assignment. */
export async function suggestSessionTeams(id:number,token:string,source:'AUTO'|'FORM'|'EXCEL_POINTS'|'RANDOM'):Promise<SessionTeamSuggestion>{
 if(!Number.isSafeInteger(id)||id<=0||!token||DEMO_MODE)throw Error('Inicia sessão para consultar equipas.');
 return request<SessionTeamSuggestion>(`/api/sessions/${id}/teams/suggestion?source=${source}`,{token});
}
export async function confirmSessionTeams(id:number,token:string,source:'AUTO'|'FORM'|'EXCEL_POINTS'|'RANDOM',preview?:SessionTeamSuggestion):Promise<SessionTeamSuggestion>{
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
  const invitee=username.trim();
  if(!Number.isSafeInteger(id)||id<=0||!invitee||!token)
    throw Error('Sessão, destinatário ou autenticação inválidos para enviar convite.');
  const result=DEMO_MODE?await demoInvitePlayer(id,actor||'',invitee):
    await request<{id:number}>(`/api/sessions/${id}/invites`,{token,method:'POST',body:{username:invitee}});
  if(!Number.isSafeInteger(result?.id)||result.id<=0)
    throw Error('O servidor respondeu, mas não confirmou o convite. Confirma a lista antes de repetir.');
  return result;
}
export async function answerSessionInvite(sessionId:number,inviteId:number,accept:boolean,token:string,username?:string):Promise<JoinSessionResponse|void>{
  if(!Number.isSafeInteger(sessionId)||sessionId<=0||!Number.isSafeInteger(inviteId)||inviteId<=0||!token)
    throw Error('Identificador do convite ou autenticação inválidos.');
  if(DEMO_MODE){if(!username)throw new Error('Inicia sessão.');return demoRespondInvite(sessionId,inviteId,username,accept);}
  const result=await request<JoinSessionResponse|void>(
    `/api/sessions/${sessionId}/invites/${inviteId}/${accept?'accept':'decline'}`,{token,method:'POST',body:null});
  // The Java backend returns a JoinSessionResponse only for accept (decline is HTTP 204).
  if(accept&&!confirmedSessionJoin(result))
    throw Error('O servidor respondeu, mas não confirmou a aceitação do convite. Atualiza a lista antes de repetir.');
  return result;
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

/** An organizer-issued guest invitation permits an RSVP without a Jynlo account.
 * Issuing a new token revokes the previous token on the backend.
 */
export async function issueSessionGuestLink(id:number,token:string):Promise<string>{
  if(!Number.isSafeInteger(id)||id<=0||!token||DEMO_MODE)
    throw Error('Inicia sessão para criares uma ligação de convite válida.');
  const reply=await request<{token:string}>(`/api/sessions/${id}/guest-link`,{token,method:'POST'});
  if(!reply||typeof reply.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(reply.token))
    throw Error('O servidor não confirmou uma ligação de convite válida.');
  return `https://d24sports.com/sessions/${id}?guest=${encodeURIComponent(reply.token)}`;
}
