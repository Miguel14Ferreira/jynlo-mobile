import {DEMO_MODE,request} from './api';
import {communityDetails} from './community-api';
import {safePositiveId,teamInviteUrl} from './realtime-core.cjs';
import type {JynloTournamentTeam} from './types';
const demoTeams=new Map<string,JynloTournamentTeam[]>();let demoNext=978000;
const key=(communityId:number,tournamentId:number)=>`${safePositiveId(communityId)}:${safePositiveId(tournamentId)}`;
const base=(communityId:number,tournamentId:number)=>`/api/communities/${safePositiveId(communityId)}/tournaments/${safePositiveId(tournamentId)}/teams`;
export function shareableTeamInvite(communityId:number,tournamentId:number,teamId:number):string{
 // Web origin matches the already-published Angular deep-link contract.
 return teamInviteUrl('https://d24sports.com',communityId,tournamentId,teamId);
}
export async function tournamentTeams(communityId:number,tournamentId:number,token:string,username:string):Promise<JynloTournamentTeam[]>{
 if(!token||!username)throw Error('Inicia sessão para continuar.');
 if(DEMO_MODE)return [...(demoTeams.get(key(communityId,tournamentId))||[])];
 return request<JynloTournamentTeam[]>(base(communityId,tournamentId),{token});
}
export async function createTournamentTeam(communityId:number,tournamentId:number,name:string,token:string,username:string):Promise<JynloTournamentTeam>{
 const cleaned=name.trim();if(cleaned.length<2||cleaned.length>100)throw Error('O nome da equipa deve ter entre 2 e 100 caracteres.');
 if(!token||!username)throw Error('Inicia sessão para continuar.');
 if(DEMO_MODE){const community=await communityDetails(communityId,token,username);
  if(!('myRole' in community)||!['OWNER','ADMIN'].includes(community.myRole||''))throw Error('Só os organizadores podem criar equipas.');
  const t:JynloTournamentTeam={id:++demoNext,name:cleaned,playersPerTeam:5,createdAt:new Date().toISOString(),players:[]};
  const k=key(communityId,tournamentId);demoTeams.set(k,[...(demoTeams.get(k)||[]),t]);return t;
 }
 // Explicit tap required; never mutate the real server on screen opening.
 return request<JynloTournamentTeam>(base(communityId,tournamentId),{token,method:'POST',body:{name:cleaned}});
}
export async function acceptTeamPlace(communityId:number,tournamentId:number,teamId:number,token:string,username:string):Promise<JynloTournamentTeam>{
 if(!token||!username)throw Error('Inicia sessão para continuar.');
 if(DEMO_MODE){const community=await communityDetails(communityId,token,username);
  if(!('myRole' in community)||!community.myRole)throw Error('Primeiro tens de entrar na comunidade.');
  const k=key(communityId,tournamentId);const team=demoTeams.get(k)?.find(t=>t.id===safePositiveId(teamId));
  if(!team)throw Error('Equipa não encontrada.');
  if(team.players.some(p=>p.username===username))return team;
  if(team.playersPerTeam!==null&&team.players.length>=team.playersPerTeam)throw Error('A equipa já está completa.');
  const updated={...team,players:[...team.players,{profileId:username==='Tiago'?1001:1002,username,displayName:username}]};
  demoTeams.set(k,(demoTeams.get(k)||[]).map(t=>t.id===teamId?updated:t));return updated;
 }
 // Backend rechecks membership, roster and invite eligibility.
 return request<JynloTournamentTeam>(base(communityId,tournamentId)+`/${safePositiveId(teamId)}/players/me`,{token,method:'PUT',body:null});
}
