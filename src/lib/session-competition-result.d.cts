import type {SessionParticipant} from './types';
export type CompetitionTeam='A'|'B';
export type CompetitionOutcome=CompetitionTeam|'DRAW';
export type CompetitionRosterEntry={id:number;username:string;team:CompetitionTeam|null;selected:boolean;goals:string;assists:string};
export type CompetitionResultPayload={outcome:CompetitionOutcome;players:Array<{username:string;team:CompetitionTeam;goals?:number;assists?:number}>};
export declare function editableCompetitionRoster(roster:SessionParticipant[]):CompetitionRosterEntry[];
export declare function buildSessionCompetitionResult(outcome:CompetitionOutcome|null,players:CompetitionRosterEntry[],sport?:string|null):CompetitionResultPayload;
export declare function optionalStat(value:string|number|null|undefined,label:string):number|null;
