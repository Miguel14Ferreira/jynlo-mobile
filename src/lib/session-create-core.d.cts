export interface CreateSessionForm {
 sport:string;day:string;time:string;city:string;address:string;
 maxParticipants:string;price:string;privateGame:boolean;password:string;meetingPointInstructions:string;
 externalConfirmedParticipants?:string;minParticipants?:string;registrationOpeningMode?:'IMMEDIATE'|'MANUAL'|'SCHEDULED';communityId?:number|null;
 registrationDay?:string;registrationTime?:string;
 seasonGame?:boolean;communityRankingsEnabled?:boolean;confirmActivateRankings?:boolean;
 additionalWeeklySlots?:Array<{day:string;time:string}>;
 communityShareIds?:number[];
 venueId?:number|null;recurrence?:'NONE'|'WEEKLY'|'BIWEEKLY';recurrenceOccurrences?:string;recurrenceTimeZone?:string;
}
export interface CreateSessionPayload{
 sport:string;gameDate:string;city:string;address:string;maxParticipants:number;
 priceAmount:number;privateGame:boolean;password:string|null;
 latitude:null;longitude:null;communityId:number|null;venueId:number|null;recurrence:'NONE'|'WEEKLY'|'BIWEEKLY';
 recurrenceOccurrences:number|null;externalConfirmedParticipants:number;registrationOpeningMode:'IMMEDIATE'|'MANUAL'|'SCHEDULED';
 registrationOpensAt:string|null;additionalWeeklyGameDates:string[];recurrenceTimeZone:string|null;playFormat:null;
 communityShareIds:number[];seasonCompetitionCommunityId:number|null;confirmActivateRankings:boolean;
 meetingPointInstructions:string|null;minParticipants:number;
}
export function formatLocalDateInput(value:string):string;
export function formatLocalTimeInput(value:string):string;
export function parseSessionDate(day:string,time:string,now?:number):string;
export function validateWeeklySlots(day:string,time:string,slots:Array<{day:string;time:string}>|undefined,
 recurrence:'NONE'|'WEEKLY'|'BIWEEKLY',occurrences:number|null,now?:number):string[];
export function changeCommunityMode(form:CreateSessionForm,mode:'INDEPENDENT'|'SINGLE'|'SHARED'):CreateSessionForm;
export function describeSessionConfirmation(payload:CreateSessionPayload,context?:{
 communityName?:string;sharedCommunityNames?:string[];venueName?:string;
}):string;
export function createSessionPayload(input:CreateSessionForm,allowedSports:readonly string[],now?:number):CreateSessionPayload;
