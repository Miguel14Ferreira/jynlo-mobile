import {DEMO_MODE,request} from './api';
import {validTournamentId} from './competition-core.cjs';
import {organizerFixtureType,validateTournamentScore} from './tournament-organizer-core.cjs';
import type {JynloTournament,TournamentIndividualMatch,TournamentTeamMatch} from './types';

const base=(cid:number,tid:number)=>`/api/communities/${validTournamentId(cid)}/tournaments/${validTournamentId(tid)}`;
function requireAction(tournament:JynloTournament,token:string,username:string){
 if(!token||!username)throw Error('Inicia sessão para gerir o torneio.');
 if(DEMO_MODE)throw Error('A gestão de torneios está desativada na demonstração. Não são alterados dados reais.');
 const type=organizerFixtureType(tournament);
 if(!type)throw Error('Este formato ou modalidade ainda não suporta a gestão de confrontos no mobile.');
 return type;
}
/** POST starts a tournament. Never called on mount or automatically retried. */
export async function publishTournamentSchedule(cid:number,tournament:JynloTournament,token:string,username:string):Promise<{tournamentId:number;status:string;matchCount:number}>{
 const type=requireAction(tournament,token,username);
 if(tournament.status!=='DRAFT')throw Error('O calendário só pode ser publicado enquanto o torneio está em preparação.');
 const url=base(cid,tournament.id)+(type==='TEAM'?'/teams/schedule':'/schedule');
 return request<{tournamentId:number;status:string;matchCount:number}>(url,{token,method:'POST'});
}
/** Backend checks organizer permission, tournament state, match and scoring constraints. */
export async function saveTournamentMatchResult(cid:number,tournament:JynloTournament,matchId:number,home:string,away:string,token:string,username:string):Promise<TournamentTeamMatch|TournamentIndividualMatch>{
 const type=requireAction(tournament,token,username);
 if(tournament.status!=='IN_PROGRESS')throw Error('O torneio não está a decorrer.');
 const scores=validateTournamentScore(home,away);
 const url=base(cid,tournament.id)+(type==='TEAM'?`/teams/matches/${validTournamentId(matchId)}/result`:`/matches/${validTournamentId(matchId)}/result`);
 return request<TournamentTeamMatch|TournamentIndividualMatch>(url,{token,method:type==='TEAM'?'POST':'PUT',body:scores});
}
/** Finalization is intentionally restricted to supported leagues. Server validates all fixtures. */
export async function finishTournamentLeague(cid:number,tournament:JynloTournament,token:string,username:string):Promise<JynloTournament>{
 const type=requireAction(tournament,token,username);
 if(tournament.status!=='IN_PROGRESS'||tournament.format!=='LEAGUE')throw Error('O encerramento só está disponível para ligas a decorrer.');
 return request<JynloTournament>(base(cid,tournament.id)+(type==='TEAM'?'/teams/complete':'/complete'),{token,method:'POST'});
}
