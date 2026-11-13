import type {SessionParticipant} from './types';
export type CompetitionTeam='A'|'B';
export type CompetitionOutcome=CompetitionTeam|'DRAW';
export type CompetitionRosterEntry={id:number;username:string;team:CompetitionTeam|null;selected:boolean};
export type CompetitionResultPayload={outcome:CompetitionOutcome;players:Array<{username:string;team:CompetitionTeam}>};
export declare function editableCompetitionRoster(roster:SessionParticipant[]):CompetitionRosterEntry[];
export declare function buildSessionCompetitionResult(outcome:CompetitionOutcome|null,players:CompetitionRosterEntry[]):CompetitionResultPayload;
