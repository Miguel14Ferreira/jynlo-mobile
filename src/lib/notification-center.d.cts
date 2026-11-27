export type NotificationKind='chat'|'invite'|'session'|'payment'|'social'|'tournament'|'community'|'venue'|'other';
export type DayBucket='today'|'yesterday'|'older';
export interface NotificationRow<T>{key:string;items:T[];lead:T;bucket:DayBucket}
export function notificationKind(type:string|null|undefined):NotificationKind;
export function dayBucket(createdAt:string,now?:number):DayBucket;
export function shortTime(createdAt:string,t:(k:string,p?:Record<string,string|number>)=>string,locale?:string,now?:number):string;
export function buildSections<T extends {id:number;createdAt:string;type?:string|null}>(items:T[],now?:number):{id:DayBucket;rows:NotificationRow<T>[]}[];
