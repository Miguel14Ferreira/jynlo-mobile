import type {JynloTournament,PerformanceRound,TournamentPerformanceOverview} from './types';
export type ManagedEventKind='RACE'|'TIMED'|'MEASURED';
export const ENDPOINTS:Readonly<Record<ManagedEventKind,string>>;
export function managedKind(tournament:JynloTournament|null):ManagedEventKind|null;
export function canManageEvents(role:string|null|undefined,tournament:JynloTournament|null):boolean;
export function uniqueRounds(rounds:PerformanceRound[]|null|undefined):PerformanceRound[];
export function roundCollections(overview:TournamentPerformanceOverview|null):{linked:PerformanceRound[];available:PerformanceRound[]};
export function validateRacePointsCsv(value:string):string;
