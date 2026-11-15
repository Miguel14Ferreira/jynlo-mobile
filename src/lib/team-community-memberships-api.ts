import {DEMO_MODE,request} from './api';

export type TeamCommunityStatus='PENDING_TEAM'|'PENDING_COMMUNITY'|'ACTIVE'|'DECLINED';
export interface TeamCommunityMembership {
 id:number;teamId:number;teamName:string;communityId:number;communityName:string;status:TeamCommunityStatus;
}
const root='/api/team-community-memberships';
const valid=(id:number)=>{
 if(!Number.isSafeInteger(id)||id<=0)throw Error('Identificador inválido.');
 return id;
};
export async function communityTeamMemberships(communityId:number,token:string):Promise<TeamCommunityMembership[]>{
 if(!token||DEMO_MODE)return [];
 return request<TeamCommunityMembership[]>(root+'/communities/'+valid(communityId),{token});
}
export async function sportsTeamCommunities(teamId:number,token:string):Promise<TeamCommunityMembership[]>{
 if(!token||DEMO_MODE)return [];
 return request<TeamCommunityMembership[]>(root+'/teams/'+valid(teamId),{token});
}
export async function inviteTeamToCommunity(communityId:number,teamId:number,token:string):Promise<TeamCommunityMembership>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para convidar a equipa.');
 return request<TeamCommunityMembership>(root+'/communities/'+valid(communityId)+'/invite',
  {token,method:'POST',body:{teamId:valid(teamId)}});
}
export async function requestTeamCommunityMembership(teamId:number,communityId:number,token:string):Promise<TeamCommunityMembership>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para pedir adesão.');
 return request<TeamCommunityMembership>(root+'/teams/'+valid(teamId)+'/request',
  {token,method:'POST',body:{communityId:valid(communityId)}});
}
export async function answerTeamCommunityMembership(id:number,accept:boolean,token:string):Promise<TeamCommunityMembership>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para responder.');
 return request<TeamCommunityMembership>(root+'/'+valid(id)+'/'+(accept?'accept':'decline'),
  {token,method:'POST',body:{}});
}
export async function removeTeamCommunityMembership(id:number,token:string):Promise<void>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para gerir a equipa.');
 return request<void>(root+'/'+valid(id),{token,method:'DELETE'});
}
