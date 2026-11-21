import {DEMO_MODE,request} from './api';
import type {AvailabilityAnswer,AvailabilityRequest} from './availability-core.cjs';

export type AvailabilityKind='private'|'community';

function check(token:string,targetId:number){
 if(!token)throw Error('Inicia sessão para continuar.');
 if(!Number.isSafeInteger(targetId)||targetId<=0)throw Error('Grupo inválido.');
}

export async function openAvailability(kind:AvailabilityKind,targetId:number,token:string):Promise<AvailabilityRequest[]>{
 check(token,targetId);
 if(DEMO_MODE)return [];
 return request<AvailabilityRequest[]>(`/api/availability?kind=${kind}&targetId=${targetId}`,{token});
}

export async function createAvailability(kind:AvailabilityKind,targetId:number,slots:string[],note:string,token:string):Promise<AvailabilityRequest>{
 check(token,targetId);
 if(DEMO_MODE)throw Error('Indisponível na demonstração.');
 return request<AvailabilityRequest>('/api/availability',{token,method:'POST',body:{kind,targetId,note:note.trim()||null,slots}});
}

export async function answerAvailability(id:number,slotId:number,answer:AvailabilityAnswer,token:string):Promise<AvailabilityRequest>{
 if(!token)throw Error('Inicia sessão para continuar.');
 if(DEMO_MODE)throw Error('Indisponível na demonstração.');
 return request<AvailabilityRequest>(`/api/availability/${id}/slots/${slotId}/answer`,{token,method:'PUT',body:{answer}});
}

export async function closeAvailability(id:number,token:string):Promise<void>{
 if(!token)throw Error('Inicia sessão para continuar.');
 if(DEMO_MODE)return;
 await request<void>(`/api/availability/${id}/close`,{token,method:'POST',body:null});
}
