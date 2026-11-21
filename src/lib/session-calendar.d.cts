export const DEFAULT_MINUTES:number;
export function calendarWindow(gameDate:string,minutes?:number):{start:Date;end:Date;dates:string}|null;
export function calendarLocation(session:{city?:string|null}|null,exactAddress:string|null|undefined):string;
export function googleCalendarUrl(session:{id?:number;sport?:string|null;gameDate?:string|null;city?:string|null;creatorUsername?:string|null}|null,exactAddress:string|null|undefined,now?:number):string|null;
