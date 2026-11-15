import {DEMO_MODE,request} from './api';

export type TeamCompetitionType = 'TOURNAMENT'|'CHAMPIONSHIP';
export interface TeamCompetitionInvitation {
  id:number;
  teamId:number;
  teamName:string;
  communityId:number;
  competitionType:TeamCompetitionType;
  competitionId:number;
  status:'PENDING'|'ACCEPTED'|'DECLINED';
}
const prefix='/api/team-competition-invitations';
const valid=(id:number)=>{
 if(!Number.isSafeInteger(id)||id<=0)throw Error('Identificador inválido.');
 return id;
};
export async function teamCompetitionInvitations(communityId:number,type:TeamCompetitionType,
 competitionId:number,token:string):Promise<TeamCompetitionInvitation[]>{
 if(!token||DEMO_MODE)return [];
 return request<TeamCompetitionInvitation[]>(prefix+'/communities/'+valid(communityId)+'/'+type+
  '/'+valid(competitionId),{token});
}
export async function inviteTeamToCompetition(communityId:number,type:TeamCompetitionType,
 competitionId:number,teamId:number,token:string):Promise<TeamCompetitionInvitation>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para convidar uma equipa.');
 return request<TeamCompetitionInvitation>(prefix+'/communities/'+valid(communityId)+'/'+type+
  '/'+valid(competitionId),{token,method:'POST',body:{teamId:valid(teamId)}});
}
export async function myTeamCompetitionInvitations(token:string):Promise<TeamCompetitionInvitation[]>{
 if(!token||DEMO_MODE)return [];
 return request<TeamCompetitionInvitation[]>(prefix+'/mine',{token});
}
export async function answerTeamCompetitionInvitation(id:number,accept:boolean,
 token:string):Promise<TeamCompetitionInvitation>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para responder.');
 return request<TeamCompetitionInvitation>(prefix+'/'+valid(id)+'/'+(accept?'accept':'decline'),
  {token,method:'POST',body:{}});
}
