import {request,DEMO_MODE} from './api';
import type {SessionParticipant} from './types';
import type {CompetitionResultPayload} from './session-competition-result.cjs';

function resource(communityId:number,sessionId:number){
 if(!Number.isSafeInteger(communityId)||communityId<=0||!Number.isSafeInteger(sessionId)||sessionId<=0)
  throw Error('Comunidade ou sessão inválida.');
 return '/api/communities/'+communityId+'/sessions/'+sessionId;
}
/** Admin-only roster; the backend checks community role and rankings policy. */
export async function competitionSessionRoster(communityId:number,sessionId:number,token:string|null){
 if(!token||DEMO_MODE)throw Error('Inicia sessão para consultar os jogadores.');
 return request<SessionParticipant[]>(resource(communityId,sessionId)+'/competition-result/roster',{token});
}
/** Admin-only recorded IDs; used to avoid submitting a duplicate round. */
export async function recordedCompetitionSessionIds(communityId:number,token:string|null){
 if(!token||DEMO_MODE)throw Error('Inicia sessão para consultar os resultados.');
 if(!Number.isSafeInteger(communityId)||communityId<=0)throw Error('Comunidade inválida.');
 return request<number[]>('/api/communities/'+communityId+'/sessions/competition-results',{token});
}
export async function recordCompetitionSessionResult(communityId:number,sessionId:number,token:string|null,payload:CompetitionResultPayload){
 if(!token||DEMO_MODE)throw Error('Inicia sessão para registar resultados.');
 return request<{id:number}>(resource(communityId,sessionId)+'/competition-result',{
  token,method:'POST',body:payload
 });
}
