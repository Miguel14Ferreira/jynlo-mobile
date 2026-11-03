import type {JynloTournament} from './types';
export interface TournamentEntry {communityId:number;communityName:string;tournament:JynloTournament;}
export const STATUSES:ReadonlyArray<{value:'ALL'|'IN_PROGRESS'|'DRAFT'|'COMPLETED';label:string}>;
export function sportIcon(sport:string|null|undefined):string;
export function availableSports(entries:TournamentEntry[]):string[];
export function filterTournaments(entries:TournamentEntry[],opts?:{query?:string;status?:string;sport?:string}):TournamentEntry[];
