import {DEMO_MODE,request} from './api';
import {validTournamentId} from './competition-core.cjs';
import {canManageEvents,managedKind,ENDPOINTS,validateRacePointsCsv} from './tournament-events-core.cjs';
import type {JynloTournament} from './types';

function path(communityId:number,tournamentId:number,endpoint:string):string{
 return '/api/communities/'+validTournamentId(communityId)+'/tournaments/'+validTournamentId(tournamentId)+'/'+endpoint;
}
function guard(role:string|null,tournament:JynloTournament,token:string,username:string){
 if(!token||!username)throw Error('Inicia sessão para organizar esta competição.');
 if(DEMO_MODE)throw Error('Na demonstração não é possível alterar provas reais.');
 if(!canManageEvents(role,tournament))throw Error('Esta operação exige um organizador e uma competição não concluída.');
 const kind=managedKind(tournament);
 if(!kind)throw Error('Esta modalidade não suporta associação de jornadas neste ecrã.');
 return ENDPOINTS[kind];
}
/** No automatic retries. PUT/DELETE are sent only after explicit native confirmation. */
export async function changeTournamentRound(communityId:number,tournament:JynloTournament,roundId:number,
 action:'link'|'unlink',token:string,username:string,role:string|null):Promise<void>{
 const endpoint=guard(role,tournament,token,username);
 if(!Number.isSafeInteger(roundId)||roundId<=0)throw Error('Jornada inválida.');
 if(action!=='link'&&action!=='unlink')throw Error('Operação inválida.');
 await request<unknown>(path(communityId,tournament.id,endpoint)+'/'+roundId,{
  token,method:action==='link'?'PUT':'DELETE'
 });
}
/** Race scoring is editable only before a race is linked. The server enforces that too. */
export async function updateTournamentRacePoints(communityId:number,tournament:JynloTournament,csv:string,
 token:string,username:string,role:string|null):Promise<void>{
 const endpoint=guard(role,tournament,token,username);
 if(endpoint!=='races'||tournament.status!=='DRAFT')throw Error('A pontuação só pode ser definida antes de iniciar um campeonato de corridas.');
 const pointsByPlace=validateRacePointsCsv(csv);
 await request<unknown>(path(communityId,tournament.id,endpoint)+'/points',{
  token,method:'PUT',body:{pointsByPlace}
 });
}
