import {DEMO_MODE,request} from './api';
export type EnrollmentType='TOURNAMENT'|'CHAMPIONSHIP';
export interface GlobalCompetitionEntry {
 id:number;globalTeamId:number;communityId:number;competitionId:number;
 competitionType:EnrollmentType;name:string;confirmedGlobalPlayers:number;message:string;
}
export interface GlobalRosterCandidate {
 profileId:number;username:string;communityMember:boolean;
}
const base='/api/team-competition-enrollments';
const valid=(id:number)=>{
 if(!Number.isSafeInteger(id)||id<=0)throw Error('Identificador inválido.');
 return id;
};
const competitionPath=(communityId:number,type:EnrollmentType,competitionId:number)=>
 base+'/communities/'+valid(communityId)+'/'+type+'/'+valid(competitionId);

export async function finalizeGlobalTeamEntry(communityId:number,type:EnrollmentType,
 competitionId:number,globalTeamId:number,token:string):Promise<GlobalCompetitionEntry>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para finalizar a inscrição.');
 return request<GlobalCompetitionEntry>(competitionPath(communityId,type,competitionId),
  {token,method:'POST',body:{globalTeamId:valid(globalTeamId)}});
}
export async function eligibleGlobalRoster(communityId:number,type:EnrollmentType,
 competitionId:number,globalTeamId:number,token:string):Promise<GlobalRosterCandidate[]>{
 if(!token||DEMO_MODE)return [];
 return request<GlobalRosterCandidate[]>(competitionPath(communityId,type,competitionId)+
  '/teams/'+valid(globalTeamId)+'/roster',{token});
}
export async function inviteGlobalRoster(communityId:number,type:EnrollmentType,competitionId:number,
 globalTeamId:number,profileIds:number[],token:string):Promise<{invitationsSent:number}>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para convidar jogadores.');
 if(!profileIds.length||profileIds.length>30||new Set(profileIds).size!==profileIds.length)
   throw Error('Seleciona entre 1 e 30 jogadores diferentes.');
 return request<{invitationsSent:number}>(competitionPath(communityId,type,competitionId)+
  '/invite-players',{token,method:'POST',body:{globalTeamId:valid(globalTeamId),profileIds}});
}
