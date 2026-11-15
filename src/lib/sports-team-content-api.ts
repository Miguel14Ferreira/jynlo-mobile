import {DEMO_MODE,request} from './api';

export type TeamContentKind='chat'|'feed';
export interface TeamContentEntry {
 id:number;teamId:number;username:string;body:string;createdAt:string;
 replyToId:number|null;editedAt:string|null;deleted:boolean;canManage:boolean;canEdit:boolean;
}
const endpoint=(teamId:number,kind:TeamContentKind)=>{
 if(!Number.isSafeInteger(teamId)||teamId<=0)throw Error('Equipa inválida.');
 return '/api/teams/'+teamId+'/'+kind;
};
export async function teamContentHistory(teamId:number,kind:TeamContentKind,token:string):Promise<TeamContentEntry[]>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para consultar esta conversa.');
 return request<TeamContentEntry[]>(endpoint(teamId,kind),{token});
}
export async function searchTeamContent(teamId:number,kind:TeamContentKind,query:string,token:string):Promise<TeamContentEntry[]>{
 const term=query.trim();
 if(!token||DEMO_MODE)throw Error('Inicia sessão para pesquisar.');
 if(term.length<2||term.length>80)throw Error('Pesquisa entre 2 e 80 caracteres.');
 return request<TeamContentEntry[]>(endpoint(teamId,kind)+'/search?q='+encodeURIComponent(term),{token});
}
export async function sendTeamContent(teamId:number,kind:TeamContentKind,body:string,token:string,replyToId:number|null=null):Promise<TeamContentEntry>{
 const message=body.trim();
 if(!token||DEMO_MODE)throw Error('Inicia sessão para publicar.');
 if(!message||message.length>2000)throw Error('Escreve até 2000 caracteres.');
 return request<TeamContentEntry>(endpoint(teamId,kind),{token,method:'POST',body:{body:message,replyToId}});
}

export async function editTeamContent(teamId:number,kind:TeamContentKind,id:number,body:string,token:string):Promise<TeamContentEntry>{
 const message=body.trim();
 if(!token||DEMO_MODE)throw Error('Inicia sessão para editar.');
 if(!message||message.length>2000)throw Error('Escreve até 2000 caracteres.');
 if(!Number.isSafeInteger(id)||id<=0)throw Error('Mensagem inválida.');
 return request<TeamContentEntry>(endpoint(teamId,kind)+'/'+id,{token,method:'PATCH',body:{body:message}});
}
export async function deleteTeamContent(teamId:number,kind:TeamContentKind,id:number,token:string):Promise<void>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para eliminar.');
 if(!Number.isSafeInteger(id)||id<=0)throw Error('Mensagem inválida.');
 return request<void>(endpoint(teamId,kind)+'/'+id,{token,method:'DELETE'});
}

export interface TeamReactionState { counts:Record<string,number>;mine:string|null }
export async function teamReactionSummaries(teamId:number,kind:TeamContentKind,ids:number[],token:string):Promise<Record<number,TeamReactionState>>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para consultar reações.');
 if(ids.length===0)return {};
 if(ids.length>100||ids.some(id=>!Number.isSafeInteger(id)||id<=0))throw Error('Lista de mensagens inválida.');
 return request<Record<number,TeamReactionState>>(endpoint(teamId,kind)+'/reactions?ids='+ids.join(','),{token});
}
export async function setTeamReaction(teamId:number,kind:TeamContentKind,id:number,emoji:string,token:string):Promise<void>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para reagir.');
 if(!['👍','❤️','😂','🔥','👏'].includes(emoji))throw Error('Reação inválida.');
 return request<void>(endpoint(teamId,kind)+'/'+id+'/reaction',{token,method:'PUT',body:{emoji}});
}
export async function removeTeamReaction(teamId:number,kind:TeamContentKind,id:number,token:string):Promise<void>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para reagir.');
 return request<void>(endpoint(teamId,kind)+'/'+id+'/reaction',{token,method:'DELETE'});
}
