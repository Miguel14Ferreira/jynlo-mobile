import {DEMO_MODE,request} from './api';
import {classificationKind,validTournamentId} from './competition-core.cjs';
import {validPage} from './tournament-fixtures-core.cjs';
import type {JynloTournament,TournamentIndividualMatchPage,TournamentIndividualMatch,
 TimedOverview,MeasuredOverview,RaceOverview,RelayOverview,TournamentPerformanceOverview} from './types';

const url=(communityId:number,tournamentId:number)=>
 `/api/communities/${validTournamentId(communityId)}/tournaments/${validTournamentId(tournamentId)}`;
function auth(token:string,username:string){if(!token||!username)throw Error('Inicia sessão para continuar.');}
const playedAt='2026-10-31T15:30:00Z';
function sample(kind:'TIMED'|'MEASURED'|'RACE'|'RELAY',tournamentId:number):TournamentPerformanceOverview{
 if(kind==='TIMED')return {kind,data:{tournamentId,eventType:'SWIMMING',eventDiscipline:'100m livres',availableRounds:[],
  linkedRounds:[{id:950003,name:'100m livres — prova de demonstração',sport:'Natação',playedAt}],
  standings:[{position:1,communityPlayerId:1,profileId:null,username:null,fullName:'André',bestSeconds:65.238,validAttempts:2},
   {position:2,communityPlayerId:2,profileId:null,username:null,fullName:'Tiago',bestSeconds:68.74,validAttempts:2}]}};
 if(kind==='MEASURED')return {kind,data:{tournamentId,eventType:'LONG_JUMP',eventDiscipline:'Comprimento',availableRounds:[],
  linkedRounds:[{id:950004,name:'Salto em comprimento — prova de demonstração',sport:'Atletismo',playedAt}],
  standings:[{position:1,communityPlayerId:3,profileId:null,username:null,fullName:'André',bestMetres:5.92,validMarks:3},
   {position:2,communityPlayerId:4,profileId:null,username:null,fullName:'Tiago',bestMetres:5.66,validMarks:2}]}};
 if(kind==='RACE')return {kind,data:{tournamentId,pointsByPlace:[25,18,15,12,10],availableRaces:[],
  linkedRaces:[{id:950002,name:'Grande Prémio do Parque',sport:'Karting',playedAt}],
  standings:[{position:1,playerId:1,fullName:'João',races:4,wins:2,podiums:4,bestFinish:1,championshipPoints:75,penaltyPoints:0},
   {position:2,playerId:2,fullName:'Tiago',races:4,wins:1,podiums:3,bestFinish:1,championshipPoints:64,penaltyPoints:0},
   {position:3,playerId:3,fullName:'André',races:4,wins:1,podiums:2,bestFinish:1,championshipPoints:58,penaltyPoints:2}]}};
 return {kind,data:{tournamentId,eventDiscipline:'4×100m',teams:[],heats:[],finalPublished:false,finalists:[],finalStandings:[],
  qualifyingStandings:[{position:1,teamId:70,teamName:'Os Rápidos',bestSeconds:45.32,recordedHeats:2,runnerProfileIds:[1,2,3,4]}],
  standings:[{position:1,teamId:70,teamName:'Os Rápidos',bestSeconds:45.32,recordedHeats:2,runnerProfileIds:[1,2,3,4]}]}};
}
/** A GET only. No score, placement, tie-break or linked-round mutation happens in mobile. */
export async function performanceOverview(communityId:number,tournament:JynloTournament,token:string,username:string):Promise<TournamentPerformanceOverview>{
 auth(token,username);
 const kind=classificationKind(tournament),id=validTournamentId(tournament.id);
 const endpoints={RACE:'races',TIMED:'times',MEASURED:'marks',RELAY:'relays'} as const;
 if(kind!=='RACE'&&kind!=='TIMED'&&kind!=='MEASURED'&&kind!=='RELAY')throw Error('Esta modalidade não tem uma classificação por prova compatível.');
 if(DEMO_MODE){
  const expectedCommunity={RACE:930002,TIMED:930003,MEASURED:930004,RELAY:930004};
  const expectedTournament={RACE:940002,TIMED:940003,MEASURED:940004,RELAY:940005};
  if(Number(communityId)!==expectedCommunity[kind]||id!==expectedTournament[kind])throw Error('Prova fictícia não encontrada.');
  return sample(kind,id);
 }
 const base=url(communityId,id);
 if(kind==='RACE')return {kind,data:await request<RaceOverview>(`${base}/${endpoints[kind]}`,{token})};
 if(kind==='TIMED')return {kind,data:await request<TimedOverview>(`${base}/${endpoints[kind]}`,{token})};
 if(kind==='MEASURED')return {kind,data:await request<MeasuredOverview>(`${base}/${endpoints[kind]}`,{token})};
 return {kind:'RELAY',data:await request<RelayOverview>(`${base}/${endpoints[kind]}`,{token})};
}
const DEMO_INDIVIDUAL:TournamentIndividualMatch[]=[
 {id:980006,roundNumber:1,homeProfileId:10,homeUsername:'Tiago',awayProfileId:11,awayUsername:'André',status:'COMPLETED',homeScore:2,awayScore:1},
 {id:980007,roundNumber:2,homeProfileId:12,homeUsername:'João',awayProfileId:10,awayUsername:'Tiago',status:'SCHEDULED',homeScore:null,awayScore:null}
];
export async function individualTournamentMatches(communityId:number,tournamentId:number,page:number,token:string,username:string):Promise<TournamentIndividualMatchPage>{
 auth(token,username);const base=url(communityId,tournamentId),p=validPage(page);
 if(DEMO_MODE){const matches=communityId===930005&&tournamentId===940006?DEMO_INDIVIDUAL:[];
  return {matches:matches.slice(p*20,(p+1)*20),page:p,hasMore:(p+1)*20<matches.length};}
 return request<TournamentIndividualMatchPage>(`${base}/matches?page=${p}`,{token});
}
