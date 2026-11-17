import {DEMO_MODE,request} from './api';
export type ChallengeStatus='PENDING'|'ACCEPTED'|'DECLINED'|'CANCELLED';
export type TeamChallenge={
 id:number;challengerTeamId:number;challengerTeamName:string;
 challengedTeamId:number;challengedTeamName:string;status:ChallengeStatus;
 message:string|null;sessionId:number|null;createdAt:string;respondedAt:string|null;
};
const valid=(id:number)=>{if(!Number.isSafeInteger(id)||id<=0)throw Error('Identificador inválido.');return id;};
const authorized=(token:string|null)=>{if(!token||DEMO_MODE)throw Error('Inicia sessão para gerir desafios.');return token;};
export async function teamChallenges(id:number,token:string|null):Promise<TeamChallenge[]>{
 return request<TeamChallenge[]>('/api/team-challenges/teams/'+valid(id),{token:authorized(token)});
}
export async function issueTeamChallenge(teamId:number,challengedTeamId:number,message:string,token:string|null):Promise<TeamChallenge>{
 valid(teamId);valid(challengedTeamId);
 if(message.length>280)throw Error('A mensagem não pode exceder 280 caracteres.');
 return request<TeamChallenge>('/api/team-challenges/teams/'+teamId,{
  token:authorized(token),method:'POST',body:{challengedTeamId,message}
 });
}
export async function answerTeamChallenge(id:number,accept:boolean,token:string|null):Promise<TeamChallenge>{
 return request<TeamChallenge>('/api/team-challenges/'+valid(id)+'/'+(accept?'accept':'decline'),{
  token:authorized(token),method:'POST',body:{}
 });
}
export async function cancelTeamChallenge(id:number,token:string|null):Promise<TeamChallenge>{
 return request<TeamChallenge>('/api/team-challenges/'+valid(id)+'/cancel',{
  token:authorized(token),method:'POST',body:{}
 });
}
export async function linkTeamChallengeSession(id:number,sessionId:number,token:string|null):Promise<TeamChallenge>{
 return request<TeamChallenge>('/api/team-challenges/'+valid(id)+'/session',{
  token:authorized(token),method:'POST',body:{sessionId:valid(sessionId)}
 });
}
