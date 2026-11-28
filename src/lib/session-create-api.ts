import {DEMO_MODE,request} from './api';
import {createSessionPayload} from './session-create-core.cjs';
import {SPORTS} from './sports';
import type {SessionDetail} from './types';
import type {CreateSessionForm,CreateSessionPayload} from './session-create-core.cjs';

/** One POST per deliberate confirmation; do not retry after a timeout. */
export async function createSessionWithPayload(payload:CreateSessionPayload,token:string,username:string):Promise<SessionDetail>{
 if(!token||!username)throw Error('Inicia sessão para criar um jogo.');
 if(DEMO_MODE)throw Error('A demonstração não permite criar jogos reais.');
 const created=await request<SessionDetail>('/api/sessions',{token,method:'POST',body:payload});
 if(!Number.isSafeInteger(created?.id)||created.id<=0)throw Error('O servidor não confirmou o identificador do jogo. Consulta os teus jogos antes de repetir.');
 return created;
}
/** Convenience API for callers without a separate review step. */
export async function createSession(input:CreateSessionForm,token:string,username:string):Promise<SessionDetail>{
 return createSessionWithPayload(createSessionPayload(input,SPORTS),token,username);
}
