import {DEMO_MODE,request} from './api';

export type TeamContentKind='chat'|'feed';
export interface TeamContentEntry {
 id:number;teamId:number;username:string;body:string;createdAt:string;
}
const endpoint=(teamId:number,kind:TeamContentKind)=>{
 if(!Number.isSafeInteger(teamId)||teamId<=0)throw Error('Equipa inválida.');
 return '/api/teams/'+teamId+'/'+kind;
};
export async function teamContentHistory(teamId:number,kind:TeamContentKind,token:string):Promise<TeamContentEntry[]>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para consultar esta conversa.');
 return request<TeamContentEntry[]>(endpoint(teamId,kind),{token});
}
export async function sendTeamContent(teamId:number,kind:TeamContentKind,body:string,token:string):Promise<TeamContentEntry>{
 const message=body.trim();
 if(!token||DEMO_MODE)throw Error('Inicia sessão para publicar.');
 if(!message||message.length>2000)throw Error('Escreve até 2000 caracteres.');
 return request<TeamContentEntry>(endpoint(teamId,kind),{token,method:'POST',body:{body:message}});
}
