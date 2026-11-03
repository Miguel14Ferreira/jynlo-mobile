export type ActionKind='NONE'|'LOGIN'|'JOINED'|'WAITLISTED'|'CLOSED'|'JOIN'|'WAITLIST'|'PASSWORD'|'SCHEDULED';
export interface Action {kind:ActionKind;label:string;hint?:string}
export function registrationAction(s:import('./types').SessionDetail|null,viewer:string|null,at?:number):Action;
export function isOrganizer(s:import('./types').SessionDetail|null,viewer:string|null):boolean;
export function canLeave(s:import('./types').SessionDetail|null):boolean;
export function canViewRoster(s:import('./types').SessionDetail|null,viewer:string|null):boolean;
export function safeExactAddress(s:import('./types').SessionDetail|null,viewer:string|null):string|null;
export function safeMeetingPoint(s:import('./types').SessionDetail|null,viewer:string|null):string|null;
