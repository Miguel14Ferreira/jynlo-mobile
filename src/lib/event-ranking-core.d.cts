export type EventRankingKind='TIME'|'SCORE'|'POSITION';
export interface EventRankingDraftRow {participantId:number;name:string;raw:string;dnf:boolean;}
export interface EventRankingResultInput {participantId:number;value:number|null;position:number|null;didNotFinish:boolean;}
export const KINDS:readonly EventRankingKind[];
export const KIND_LABELS:Record<EventRankingKind,string>;
export const KIND_SHORT:Record<EventRankingKind,string>;
export function parseEventValue(raw:string,kind:EventRankingKind):number|null;
export function formatEventValue(value:number|null|undefined,kind:EventRankingKind):string;
export function buildResults(rows:EventRankingDraftRow[],kind:EventRankingKind):EventRankingResultInput[];
export function draftRows(participants:{id:number;name:string}[],event:{results:{participantId:number;value:number|null;place:number|null;didNotFinish:boolean}[]}|null,kind:EventRankingKind):EventRankingDraftRow[];
