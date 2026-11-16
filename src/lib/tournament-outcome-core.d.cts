import type {JynloTournament} from './types';
export interface OfficialTournamentOutcome {title:string;detail:string;winner:boolean;}
export function officialTournamentOutcome(tournament:JynloTournament|null|undefined):OfficialTournamentOutcome|null;
