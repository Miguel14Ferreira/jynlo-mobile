import {DEMO_MODE,request} from './api';
import type {JynloTournament,JynloTournamentPage,TournamentTable,TeamStandingRow,IndividualStandingRow,RaceStandingRow} from './types';
import {classificationKind,validTournamentId} from './competition-core.cjs';
import {communityDetails,myCommunities} from './community-api';

const good=(id:number)=>validTournamentId(id);
const base=(communityId:number,tournamentId?:number)=>`/api/communities/${good(communityId)}/tournaments`+(tournamentId?`/${good(tournamentId)}`:'');
const demoFootball:JynloTournament={id:940001,name:'Taça das Futeboladas',sport:'Futebol',entryType:'TEAM',format:'GROUP_KNOCKOUT',status:'IN_PROGRESS',createdAt:new Date().toISOString()};
const demoKarting:JynloTournament={id:940002,name:'Grande Prémio da Amizade',sport:'Karting',entryType:'INDIVIDUAL',scoringMode:'RACE_POINTS',format:'LEAGUE',status:'IN_PROGRESS',createdAt:new Date().toISOString()};
function demoTournaments(communityId:number):JynloTournament[]{
 // Existing demo public football group and any new team created by Tiago.
 if(communityId===930001)return [demoFootball];
 if(communityId===930002)return [demoKarting];
 return [];
}
export async function tournamentsForCommunity(id:number,token:string,username:string):Promise<JynloTournament[]>{
 if(!token||!username)throw Error('Inicia sessão para continuar.');
 if(DEMO_MODE){const community=await communityDetails(good(id),token,username);
  if(community.id>=931001)return community.sport==='Karting'?[demoKarting]:['Futebol','Futsal'].includes(community.sport||'')?[demoFootball]:[];
  return demoTournaments(good(id));}
 // Read first pages only, no writes and no uncontrolled unbounded pagination.
 const all:JynloTournament[]=[];
 for(let page=0;page<4;page++){
  const result=await request<JynloTournamentPage>(`${base(id)}?page=${page}`,{token});
  all.push(...result.tournaments);if(!result.hasMore)break;
 }
 return all;
}
export async function tournamentDetails(communityId:number,tournamentId:number,token:string,username:string):Promise<JynloTournament>{
 if(!token||!username)throw Error('Inicia sessão para continuar.');
 if(DEMO_MODE){const x=(await tournamentsForCommunity(communityId,token,username)).find(t=>t.id===good(tournamentId));
   if(!x)throw Error('Torneio não encontrado.');return x;}
 return request<JynloTournament>(base(communityId,tournamentId),{token});
}
export async function tournamentTable(communityId:number,tournament:JynloTournament,token:string,username:string):Promise<TournamentTable|null>{
 if(!token||!username)throw Error('Inicia sessão para continuar.');
 const kind=classificationKind(tournament);const url=base(communityId,tournament.id);
 if(kind!=='RACE'&&kind!=='TEAM'&&kind!=='INDIVIDUAL')return null;
 if(DEMO_MODE){
  if(kind==='RACE')return{kind,source:'Dados fictícios de demonstração',rows:[
    {position:1,playerId:1,fullName:'João',races:4,wins:2,podiums:4,bestFinish:1,championshipPoints:75,penaltyPoints:0},
    {position:2,playerId:2,fullName:'Tiago',races:4,wins:1,podiums:3,bestFinish:1,championshipPoints:64,penaltyPoints:0},
    {position:3,playerId:3,fullName:'André',races:4,wins:1,podiums:2,bestFinish:1,championshipPoints:58,penaltyPoints:2}
  ] as RaceStandingRow[]};
  if(kind==='TEAM')return{kind,source:'Dados fictícios de demonstração',rows:[
    {position:1,teamId:1,teamName:'Futeboladas à Balda',played:3,won:3,drawn:0,lost:0,points:9},
    {position:2,teamId:2,teamName:'Os Amigos',played:3,won:2,drawn:0,lost:1,points:6},
    {position:3,teamId:3,teamName:'Quinta FC',played:3,won:1,drawn:0,lost:2,points:3},
    {position:4,teamId:4,teamName:'Bola Rasa',played:3,won:0,drawn:0,lost:3,points:0}
  ] as TeamStandingRow[]};
  return{kind,source:'Dados fictícios de demonstração',rows:[] as IndividualStandingRow[]};
 }
 if(kind==='RACE'){
  const data=await request<{standings:RaceStandingRow[]}>(`${url}/races`,{token});
  return{kind,rows:data.standings,source:'Classificação devolvida pelo backend da Jynlo'};
 }
 if(kind==='TEAM'){
  const data=await request<{standings:TeamStandingRow[]}>(`${url}/teams/standings`,{token});
  return{kind,rows:data.standings,source:'Classificação devolvida pelo backend da Jynlo'};
 }
 const data=await request<{standings:IndividualStandingRow[]}>(`${url}/standings`,{token});
 return{kind,rows:data.standings,source:'Classificação devolvida pelo backend da Jynlo'};
}
export async function myTournaments(token:string,username:string):Promise<{communityId:number;communityName:string;tournament:JynloTournament}[]>{
 if(!token||!username)throw Error('Inicia sessão para continuar.');
 const communities=await myCommunities(token,username);const result:{communityId:number;communityName:string;tournament:JynloTournament}[]=[];
 for(const community of communities.slice(0,12)){
  const tournaments=await tournamentsForCommunity(community.id,token,username);
  for(const tournament of tournaments)result.push({communityId:community.id,communityName:community.name,tournament});
 }
 return result;
}
