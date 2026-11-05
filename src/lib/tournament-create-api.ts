import {DEMO_MODE,request} from './api';
import {validTournamentId} from './competition-core.cjs';
import {isOrganizer} from './tournament-organizer-core.cjs';
import {communityAllowsTournamentSport} from './community-competition-core.cjs';
import {createTournamentDraft} from './tournament-create-core.cjs';
import {SPORTS} from './sports';
import type {CreateTournamentInput} from './tournament-create-core.cjs';
import type {JynloTournament} from './types';

/** Only an explicit confirmation click calls this POST; never retry writes automatically. */
export async function createTournament(
 communityId:number,input:CreateTournamentInput,token:string,username:string,role:string|null,allowedSports:string[]
):Promise<JynloTournament>{
 if(!token||!username)throw Error('Inicia sessão para criar o torneio.');
 if(!isOrganizer(role))throw Error('Só proprietários e administradores podem criar torneios.');
 if(DEMO_MODE)throw Error('A criação está desativada nesta demonstração. Nenhum torneio real será alterado.');
 const payload=createTournamentDraft(input);
 if(!SPORTS.includes(payload.sport))throw Error('Esta modalidade não está no catálogo da Jynlo.');
 if(!communityAllowsTournamentSport({sports:allowedSports},payload.sport))throw Error('A modalidade não está associada a esta comunidade.');
 return request<JynloTournament>(
  '/api/communities/'+validTournamentId(communityId)+'/tournaments',
  {token,method:'POST',body:payload}
 );
}
