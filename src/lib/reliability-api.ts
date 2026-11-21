import {DEMO_MODE,request} from './api';
import {validateDisputeReason,type AttendanceHistoryItem,type ReliabilitySummary} from './reliability-core.cjs';

export async function myAttendanceHistory(token:string):Promise<AttendanceHistoryItem[]>{
 if(DEMO_MODE||!token)return [];
 return request<AttendanceHistoryItem[]>('/api/attendance/me',{token});
}
export async function reliabilitySummary(username:string,token:string|null):Promise<ReliabilitySummary|null>{
 if(DEMO_MODE||!username)return null;
 return request<ReliabilitySummary>(`/api/profiles/${encodeURIComponent(username)}/reliability`,{token});
}
/** Only the participant can dispute their own no-show, once (server-verified). Never retried automatically. */
export async function disputeNoShow(participantId:number,reason:string,token:string):Promise<void>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para contestar uma falta.');
 if(!Number.isSafeInteger(participantId)||participantId<=0)throw Error('Registo de presença inválido.');
 const text=validateDisputeReason(reason);
 await request<void>('/api/attendance-disputes',{token,method:'POST',body:{participantId,reason:text}});
}
