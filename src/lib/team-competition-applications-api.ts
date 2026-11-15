import {DEMO_MODE,request} from './api';
export type TeamCompetitionKind='TOURNAMENT'|'CHAMPIONSHIP';
export interface OpenTeamCompetition {
 id:number;communityId:number;communityName:string;type:TeamCompetitionKind;
 name:string;sport:string|null;applicationsOpen:boolean;
}
export interface TeamCompetitionApplication {
 id:number;teamId:number;teamName:string;communityId:number;
 competitionType:TeamCompetitionKind;competitionId:number;status:'PENDING'|'APPROVED'|'DECLINED';
}
const prefix='/api/team-competition-applications';
const valid=(id:number)=>{if(!Number.isSafeInteger(id)||id<=0)throw Error('Identificador inválido.');return id;};
export async function discoverTeamCompetitions(q='',sport='',token?:string):Promise<OpenTeamCompetition[]>{
 if(DEMO_MODE)return [];
 return request<OpenTeamCompetition[]>(prefix+'/discover?q='+encodeURIComponent(q.trim())+
  '&sport='+encodeURIComponent(sport.trim()),{token});
}
export async function myTeamApplications(token:string):Promise<TeamCompetitionApplication[]>{
 if(!token||DEMO_MODE)return [];
 return request<TeamCompetitionApplication[]>(prefix+'/mine',{token});
}
export async function applyTeamToCompetition(communityId:number,type:TeamCompetitionKind,
 competitionId:number,teamId:number,token:string):Promise<TeamCompetitionApplication>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para participar.');
 return request<TeamCompetitionApplication>(prefix+'/communities/'+valid(communityId)+'/'+type+
  '/'+valid(competitionId),{token,method:'POST',body:{teamId:valid(teamId)}});
}
export async function teamCompetitionApplications(communityId:number,type:TeamCompetitionKind,
 competitionId:number,token:string):Promise<TeamCompetitionApplication[]>{
 if(!token||DEMO_MODE)return [];
 return request<TeamCompetitionApplication[]>(prefix+'/communities/'+valid(communityId)+'/'+type+
  '/'+valid(competitionId),{token});
}
export async function teamCompetitionApplicationSettings(communityId:number,type:TeamCompetitionKind,
 competitionId:number,token:string):Promise<OpenTeamCompetition>{
 return request<OpenTeamCompetition>(prefix+'/communities/'+valid(communityId)+'/'+type+
  '/'+valid(competitionId)+'/settings',{token});
}
export async function configureTeamApplications(communityId:number,type:TeamCompetitionKind,
 competitionId:number,open:boolean,token:string):Promise<OpenTeamCompetition>{
 return request<OpenTeamCompetition>(prefix+'/communities/'+valid(communityId)+'/'+type+
  '/'+valid(competitionId)+'/open',{token,method:'PUT',body:{open}});
}
export async function decideTeamApplication(id:number,approve:boolean,token:string):
 Promise<TeamCompetitionApplication>{
 return request<TeamCompetitionApplication>(prefix+'/'+valid(id)+'/'+(approve?'approve':'decline'),
  {token,method:'POST',body:{}});
}
