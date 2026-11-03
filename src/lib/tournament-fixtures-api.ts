import {DEMO_MODE,request} from './api';
import {validTournamentId} from './competition-core.cjs';
import {validPage} from './tournament-fixtures-core.cjs';
import type {TournamentTeamGroups,TournamentTeamMatch,TournamentTeamMatchPage} from './types';
const base=(communityId:number,tournamentId:number)=>`/api/communities/${validTournamentId(communityId)}/tournaments/${validTournamentId(tournamentId)}/teams`;
const demoBase=(communityId:number,tournamentId:number)=>communityId===930001&&tournamentId===940001;
const DEMO_FIXTURES:TournamentTeamMatch[]=[
 {id:970001,roundNumber:1,homeTeamId:1,homeTeamName:'Futeboladas à Balda',awayTeamId:2,awayTeamName:'Os Amigos',status:'COMPLETED',homeScore:2,awayScore:1,groupNumber:1},
 {id:970002,roundNumber:1,homeTeamId:3,homeTeamName:'Quinta FC',awayTeamId:4,awayTeamName:'Bola Rasa',status:'COMPLETED',homeScore:3,awayScore:2,groupNumber:2},
 {id:970003,roundNumber:2,homeTeamId:1,homeTeamName:'Futeboladas à Balda',awayTeamId:3,awayTeamName:'Quinta FC',status:'SCHEDULED',homeScore:null,awayScore:null,groupNumber:null}
];
const DEMO_GROUPS:TournamentTeamGroups={tournamentId:940001,knockoutStarted:true,groups:[
 {groupNumber:1,standings:[{position:1,teamId:1,teamName:'Futeboladas à Balda',played:1,won:1,drawn:0,lost:0,goalsFor:2,goalsAgainst:1,goalDifference:1,points:3},{position:2,teamId:2,teamName:'Os Amigos',played:1,won:0,drawn:0,lost:1,goalsFor:1,goalsAgainst:2,goalDifference:-1,points:0}]},
 {groupNumber:2,standings:[{position:1,teamId:3,teamName:'Quinta FC',played:1,won:1,drawn:0,lost:0,goalsFor:3,goalsAgainst:2,goalDifference:1,points:3},{position:2,teamId:4,teamName:'Bola Rasa',played:1,won:0,drawn:0,lost:1,goalsFor:2,goalsAgainst:3,goalDifference:-1,points:0}]}
]};
function ensureAuth(token:string,username:string){if(!token||!username)throw Error('Inicia sessão para continuar.');}
export async function teamTournamentGroups(communityId:number,tournamentId:number,token:string,username:string):Promise<TournamentTeamGroups>{
 ensureAuth(token,username);const url=base(communityId,tournamentId);
 if(DEMO_MODE)return demoBase(communityId,tournamentId)?DEMO_GROUPS:{tournamentId,knockoutStarted:false,groups:[]};
 return request<TournamentTeamGroups>(`${url}/groups`,{token});
}
export async function teamTournamentMatches(communityId:number,tournamentId:number,page:number,token:string,username:string):Promise<TournamentTeamMatchPage>{
 ensureAuth(token,username);const url=base(communityId,tournamentId),p=validPage(page);
 if(DEMO_MODE){const matches=demoBase(communityId,tournamentId)?DEMO_FIXTURES:[];return {matches:matches.slice(p*20,(p+1)*20),page:p,hasMore:(p+1)*20<matches.length};}
 return request<TournamentTeamMatchPage>(`${url}/matches?page=${p}`,{token});
}
export async function teamProfileMatches(communityId:number,tournamentId:number,teamId:number,page:number,token:string,username:string):Promise<TournamentTeamMatchPage>{
 ensureAuth(token,username);const url=base(communityId,tournamentId),id=validTournamentId(teamId),p=validPage(page);
 if(DEMO_MODE){const matches=demoBase(communityId,tournamentId)?DEMO_FIXTURES.filter(m=>m.homeTeamId===id||m.awayTeamId===id):[];return {matches:matches.slice(p*20,(p+1)*20),page:p,hasMore:(p+1)*20<matches.length};}
 return request<TournamentTeamMatchPage>(`${url}/${id}/matches?page=${p}`,{token});
}
