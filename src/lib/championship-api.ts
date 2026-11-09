import {DEMO_MODE,request} from './api';

export interface ChampionshipCompetition {
 id:number;name:string;format:string;status:string;winnerPoints:number;
 winnerConfirmed:boolean;pointsByPlace:string|null;
}
export interface ChampionshipLeader {
 entryType:string;participantId:number;name:string;victories:number;points:number;
}
export interface CommunityChampionship {
 id:number;communityId:number;name:string;sport:string;seasonLabel:string;
 createdAt:string;competitions:ChampionshipCompetition[];winnerStandings:ChampionshipLeader[];
}
export interface ChampionshipStanding {
 entryType:string;participantId:number;name:string;points:number;victories:number;awardedCompetitions:number;
}
export interface ChampionshipStandings {
 championshipId:number;standings:ChampionshipStanding[];
 fullyScoredCompetitions:number;winnerOnlyCompetitions:number;pendingCompetitions:number;
}
const base=(communityId:number)=>{
 if(!Number.isSafeInteger(communityId)||communityId<=0)throw Error('Comunidade inválida.');
 return `/api/communities/${communityId}/championships`;
};
export async function communityChampionships(communityId:number,token:string):Promise<CommunityChampionship[]>{
 if(!token||DEMO_MODE)return [];
 const data=await request<CommunityChampionship[]>(base(communityId),{token});
 if(!Array.isArray(data))throw Error('Resposta inválida ao carregar campeonatos.');
 return data;
}
export async function championshipStandings(communityId:number,championshipId:number,token:string):Promise<ChampionshipStandings>{
 if(!token||DEMO_MODE)throw Error('A classificação dos campeonatos exige uma sessão iniciada.');
 if(!Number.isSafeInteger(championshipId)||championshipId<=0)throw Error('Campeonato inválido.');
 return request<ChampionshipStandings>(`${base(communityId)}/${championshipId}/standings`,{token});
}

export async function createCommunityChampionship(communityId:number,token:string,input:{name:string;sport:string;seasonLabel:string}):Promise<CommunityChampionship>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para criar campeonatos.');
 const name=input.name.trim(),sport=input.sport.trim(),seasonLabel=input.seasonLabel.trim();
 if(!name||name.length>120||!sport||sport.length>100||!seasonLabel||seasonLabel.length>50)
  throw Error('Preenche o nome, a modalidade e a época dentro dos limites permitidos.');
 return request<CommunityChampionship>(base(communityId),{token,method:'POST',body:{name,sport,seasonLabel}});
}

export async function addChampionshipCompetition(communityId:number,championshipId:number,tournamentId:number,token:string):Promise<CommunityChampionship>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para gerir campeonatos.');
 if(!Number.isSafeInteger(championshipId)||championshipId<=0||!Number.isSafeInteger(tournamentId)||tournamentId<=0)
  throw Error('Campeonato ou torneio inválido.');
 return request<CommunityChampionship>(`${base(communityId)}/${championshipId}/competitions/${tournamentId}`,{token,method:'POST'});
}
export async function setChampionshipWinnerPoints(communityId:number,championshipId:number,tournamentId:number,points:number,token:string):Promise<CommunityChampionship>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para gerir campeonatos.');
 if(!Number.isSafeInteger(championshipId)||championshipId<=0||!Number.isSafeInteger(tournamentId)||tournamentId<=0)
  throw Error('Campeonato ou torneio inválido.');
 if(!Number.isInteger(points)||points<0||points>10000)throw Error('A pontuação deve estar entre 0 e 10000.');
 return request<CommunityChampionship>(`${base(communityId)}/${championshipId}/competitions/${tournamentId}/winner-points`,{token,method:'PUT',body:{points}});
}
