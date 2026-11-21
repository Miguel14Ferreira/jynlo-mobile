import type {CreateSessionForm} from './session-create-core.cjs';
export interface SessionPresetSettings{
 sport:string;playFormat:'INDIVIDUAL'|'PAIRS'|null;city:string|null;address:string|null;description:string|null;
 maxParticipants:number;creationMode:'START'|'COMPLETE'|null;confirmedPlayers:number|null;hasPrice:boolean|null;priceAmount:number|null;
 privateGame:boolean|null;communityShareIds:number[]|null;communityId:number|null;seasonGame:boolean|null;
 selectedVenueId:number|null;locationMethod:'venue'|'maps'|'gps'|null;latitude:number|null;longitude:number|null;venueMapLink:string|null;
 recurrence:'NONE'|'WEEKLY'|'BIWEEKLY'|null;recurrenceOccurrences:number|null;weeklySessionsPerWeek:number|null;
 registrationOpeningMode:'IMMEDIATE'|'SCHEDULED'|'MANUAL'|null;
}
export interface SessionPreset{id:number;name:string;settings:SessionPresetSettings;createdAt:string;updatedAt:string;}
export type PresetNote='community'|'weeklySlots'|'gps'|'registration';
export const MAX_PRESETS:number;export const MAX_NAME:number;
export function validatePresetName(name:string):string;
export function presetFromForm(form:CreateSessionForm,ctx:{hasExistingPlayers:boolean;locationMode:'saved'|'link'|'gps';verifiedMapsLink:string}):SessionPresetSettings;
export function formFromPreset(empty:CreateSessionForm,settings:SessionPresetSettings,ctx:{sports:readonly string[];communityIds:number[]}):{
 form:CreateSessionForm;communityMode:'INDEPENDENT'|'SINGLE'|'SHARED';hasExistingPlayers:boolean;locationMode:'saved'|'link'|'gps';
 mapsLink:string;venueId:number|null;notes:PresetNote[];};
export function presetNotesText(notes:PresetNote[]):string[];
