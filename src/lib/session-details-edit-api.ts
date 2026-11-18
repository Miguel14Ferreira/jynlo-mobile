import {DEMO_MODE,request} from './api';
import type {SessionDetail} from './types';

export interface SessionDetailsUpdate {
 sport:string;gameDate:string;maxParticipants:number;minParticipants:number;
 priceAmount:number;city:string;address:string;meetingPointInstructions:string|null;
 description:string;
}
/** Organizer-only PATCH matching Jynlo Web. Do not retry uncertain writes. */
export async function updateSessionDetails(sessionId:number,token:string,fields:SessionDetailsUpdate):Promise<SessionDetail>{
 if(!Number.isSafeInteger(sessionId)||sessionId<=0||!token||DEMO_MODE)
  throw Error('Inicia sessão para editar os detalhes.');
 return request<SessionDetail>(`/api/sessions/${sessionId}/details`,{
  token,method:'PATCH',body:fields
 });
}
