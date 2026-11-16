import type {JynloTournament} from './types';
export type OrganizerFixtureType='TEAM'|'INDIVIDUAL'|null;
export function isOrganizer(role:string|null|undefined):boolean;
export function organizerFixtureType(tournament:JynloTournament|null):OrganizerFixtureType;
export function canGenerateSchedule(role:string|null|undefined,tournament:JynloTournament|null):boolean;
export function canRecordTournamentResult(role:string|null|undefined,tournament:JynloTournament|null):boolean;
export function canCompleteTournament(role:string|null|undefined,tournament:JynloTournament|null):boolean;
export function validateTournamentScore(home:string,away:string):{homeScore:number;awayScore:number};
export function validateTournamentMatchScore(tournament:JynloTournament,match:{id:number;groupNumber?:number|null},home:string,away:string):{homeScore:number;awayScore:number};
export function organizerMatchWriteGuard(
 tournament:JynloTournament|null,
 match:{id:number;roundNumber:number;groupNumber?:number|null}|null|undefined,
 matches:ReadonlyArray<{roundNumber:number;groupNumber?:number|null}>,
 groupState:{knockoutStarted:boolean}|null,
 groupsConfirmed:boolean
):{allowed:boolean;reason:string|null};
