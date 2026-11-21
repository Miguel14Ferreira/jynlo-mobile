export type ClientErrorReport={platform:'android'|'ios'|'web';appVersion:string;route:string;message:string;stack:string;fatal:boolean};
export function buildReport(error:unknown,context?:{platform?:string;appVersion?:string|null;route?:string|null;fatal?:boolean}):ClientErrorReport|null;
export function createSendGate(now?:()=>number):(report:ClientErrorReport|null)=>boolean;
export const MAX_PER_RUN:number;
export const REPEAT_WINDOW_MS:number;
