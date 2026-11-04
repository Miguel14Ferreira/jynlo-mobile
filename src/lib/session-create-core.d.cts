export interface CreateSessionForm {
 sport:string;day:string;time:string;city:string;address:string;
 maxParticipants:string;price:string;privateGame:boolean;password:string;meetingPointInstructions:string;
 externalConfirmedParticipants?:string;minParticipants?:string;registrationOpeningMode?:'IMMEDIATE'|'MANUAL';
}
export interface CreateSessionPayload{
 sport:string;gameDate:string;city:string;address:string;maxParticipants:number;
 priceAmount:number;privateGame:boolean;password:string|null;
 latitude:null;longitude:null;communityId:null;venueId:null;recurrence:'NONE';
 recurrenceOccurrences:null;externalConfirmedParticipants:number;registrationOpeningMode:'IMMEDIATE'|'MANUAL';
 registrationOpensAt:null;additionalWeeklyGameDates:[];recurrenceTimeZone:null;playFormat:null;
 communityShareIds:[];seasonCompetitionCommunityId:null;confirmActivateRankings:false;
 meetingPointInstructions:string|null;minParticipants:number;
}
export function parseSessionDate(day:string,time:string,now?:number):string;
export function createSessionPayload(input:CreateSessionForm,allowedSports:readonly string[],now?:number):CreateSessionPayload;
