import {DEMO_MODE,request} from './api';
import {canManageRelay,positiveId,validateHeatNumber,validateElapsedSeconds,validateRunners,validateDecision,canRecordStage,decisionAllowed} from './relay-organizer-core.cjs';
import type {JynloTournament,JynloTournamentTeam,RelayOverview,RelayHeat} from './types';
const url=(cid:number,tid:number)=>'/api/communities/'+positiveId(cid)+'/tournaments/'+positiveId(tid)+'/relays';
function guard(role:string|null,t:JynloTournament,token:string,username:string){
 if(!token||!username)throw Error('Inicia sessão para gerir as estafetas.');
 if(DEMO_MODE)throw Error('A demonstração não altera resultados.');
 if(!canManageRelay(role,t))throw Error('Esta ação exige um organizador e um torneio de estafetas ativo.');
}
export async function recordRelayHeat(cid:number,t:JynloTournament,role:string|null,token:string,username:string,
 overview:RelayOverview,stage:'QUALIFICATION'|'FINAL',heatNumber:string,team:JynloTournamentTeam,runners:string,seconds:string):Promise<RelayOverview>{
 guard(role,t,token,username);
 if(!canRecordStage(overview,stage,t))throw Error('Esta fase não está aberta para novos tempos.');
 const n=validateHeatNumber(heatNumber),teamId=positiveId(team.id);
 if(!overview.teams.some(x=>x.id===teamId))throw Error('Equipa não pertence à competição.');
 if(stage==='FINAL'&&!overview.finalists.some(x=>x.teamId===teamId))throw Error('Equipa não qualificada para a final.');
 const body={elapsedSeconds:validateElapsedSeconds(seconds),runnerProfileIds:validateRunners(runners,team)};
 return request<RelayOverview>(url(cid,t.id)+(stage==='FINAL'?'/final':'')+'/heats/'+n+'/teams/'+teamId,{token,method:'PUT',body});
}
export async function publishRelayFinal(cid:number,t:JynloTournament,role:string|null,token:string,username:string,overview:RelayOverview):Promise<RelayOverview>{
 guard(role,t,token,username);
 if(t.status!=='IN_PROGRESS'||overview.finalPublished)throw Error('A final não está disponível para publicação.');
 if(overview.qualifyingStandings.length<2)throw Error('É necessário ter pelo menos duas equipas com tempos válidos.');
 return request<RelayOverview>(url(cid,t.id)+'/final/publish',{token,method:'POST'});
}
export async function decideRelayHeat(cid:number,t:JynloTournament,role:string|null,token:string,username:string,
 overview:RelayOverview,heat:RelayHeat,status:'VALID'|'DISQUALIFIED',reason:string):Promise<RelayOverview>{
 guard(role,t,token,username);
 if(!overview.heats.some(x=>x.id===heat.id)||!decisionAllowed(overview,heat,t))
  throw Error('Esta série já não aceita decisões.');
 if((heat.decisionStatus||'VALID')===status)throw Error('Esta série já tem esse estado.');
 const body=validateDecision(status,reason);
 return request<RelayOverview>(url(cid,t.id)+'/decisions/'+positiveId(heat.id),{token,method:'PUT',body});
}
