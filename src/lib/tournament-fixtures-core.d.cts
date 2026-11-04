import type {JynloTournament,TournamentTeamMatch} from './types';
export type FixtureStage='GROUP'|'KNOCKOUT'|'LEAGUE';
export function validPage(value:unknown):number;
export function teamMatchStage(match:TournamentTeamMatch,format:JynloTournament['format']):FixtureStage;
export function splitTeamMatches(matches:TournamentTeamMatch[],format:JynloTournament['format']):{
 groups:{number:number;matches:TournamentTeamMatch[]}[];
 knockout:TournamentTeamMatch[];
 league:TournamentTeamMatch[];
};
export function matchScore(match:Pick<TournamentTeamMatch,'status'|'homeScore'|'awayScore'>):string;
export function matchRound(match:Pick<TournamentTeamMatch,'roundNumber'>):string;
export function isTeamInMatch(match:TournamentTeamMatch,teamId:number):boolean;
export function canListMatches(tournament:JynloTournament|null):boolean;
