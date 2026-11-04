import {DEMO_MODE,request} from './api';
import {createSessionPayload} from './session-create-core.cjs';
import {SPORTS} from './sports';
import type {SessionDetail} from './types';
import type {CreateSessionForm} from './session-create-core.cjs';

/** One POST per deliberate confirmation; do not retry after a timeout. */
export async function createSession(input:CreateSessionForm,token:string,username:string):Promise<SessionDetail>{
 if(!token||!username)throw Error('Inicia sessão para criar uma sessão desportiva.');
 if(DEMO_MODE)throw Error('A demonstração não permite criar sessões reais.');
 const payload=createSessionPayload(input,SPORTS);
 const created=await request<SessionDetail>('/api/sessions',{token,method:'POST',body:payload});
 if(!Number.isSafeInteger(created?.id)||created.id<=0)throw Error('O servidor não confirmou o identificador da sessão. Consulta as tuas sessões antes de repetir.');
 return created;
}
