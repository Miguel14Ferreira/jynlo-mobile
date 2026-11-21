export type TournamentEntryChoice='INDIVIDUAL'|'TEAM';
export type TournamentCreateFormat='LEAGUE'|'KNOCKOUT'|'GROUP_KNOCKOUT';
export type TournamentCreateModel='NUMERIC_INDIVIDUAL'|'NUMERIC_TEAM'|'RACE_POINTS'|'CHESS_HALF_POINTS'|'SWIM_BEST_TIME'|'CANOE_BEST_TIME'|'ROWING_BEST_TIME'|'FIELD_BEST_MARK'|'TRACK_BEST_TIME'|'RELAY_BEST_TIME'|'EVENT_RANKING'|'UNAVAILABLE';
export interface CreateTournamentInput {
 name:string;sport:string;entryType:TournamentEntryChoice;format:TournamentCreateFormat;
 athleticsMode?:'FIELD'|'TRACK';eventType?:string|null;eventDiscipline?:string|null;
 groupCount?:number|null;playersPerTeam?:number|null;roundRobinLegs?:number|null;
 winPoints?:number;drawPoints?:number;lossPoints?:number;
}
export interface TournamentCreationProfile {model:TournamentCreateModel;events:string[];formats:TournamentCreateFormat[];}
export interface TournamentDraftPayload {
 name:string;sport:string;entryType:TournamentEntryChoice;format:TournamentCreateFormat;
 groupCount:number|null;playersPerTeam:number|null;roundRobinLegs:number|null;
 teamTieBreakPriority:null;winPoints:number|null;drawPoints:number|null;lossPoints:number|null;
 scoringMode:string|null;eventType:string|null;eventDiscipline:string|null;
}
export const RACE_SPORTS:ReadonlySet<string>;
export const EVENT_RANKING_SPORTS:ReadonlySet<string>;
export const DISCIPLINES:Record<string,readonly string[]>;
export function creationProfile(sport:string,entryType?:TournamentEntryChoice,athleticsMode?:'FIELD'|'TRACK'):TournamentCreationProfile;
export function disciplineChoices(eventType:string|null):readonly string[];
export function isNumericModel(model:string):boolean;
export function createTournamentDraft(data:CreateTournamentInput):TournamentDraftPayload;
