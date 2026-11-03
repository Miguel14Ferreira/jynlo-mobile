export type CompetitionKind='RACE'|'TEAM'|'INDIVIDUAL'|'TIMED'|'MEASURED'|'CHESS'|'UNSUPPORTED';
export const RACE_SPORTS:ReadonlySet<string>;
export const TEAM_MATCH_SPORTS:ReadonlySet<string>;
export function classificationKind(t:{sport?:string|null;scoringMode?:string|null;entryType?:string|null}):CompetitionKind;
export function label(kind:CompetitionKind):string;
export function standingsColumns(kind:CompetitionKind):string[];
export function validTournamentId(value:unknown):number;
