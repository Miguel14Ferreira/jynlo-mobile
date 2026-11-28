import {DEMO_MODE,request} from './api';

export type PaymentMethod='MBWAY'|'IN_PERSON'|'ONLINE';
export interface SessionPaymentPlayer{username:string;profilePicUrl:string|null;claimedAt:string|null;confirmedAt:string|null;displayName?:string|null;guest?:boolean}
export interface SessionPayments{
 priceAmount:number|null;organiser:boolean;method:PaymentMethod|null;mbwayPhone:string|null;
 me:{claimedAt:string|null;confirmedAt:string|null}|null;confirmedCount:number;playerCount:number;
 players:SessionPaymentPlayer[];lastReminderAt:string|null;
 /** The organiser who receives the money (older servers omit it). */
 payee?:{username:string|null;fullName:string|null;profilePicUrl:string|null}|null;
}

function base(sessionId:number):string{
 if(!Number.isSafeInteger(sessionId)||sessionId<=0)throw Error('Jogo inválido.');
 return `/api/sessions/${sessionId}/payments`;
}
function requireToken(token:string|null):string{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para ver os pagamentos.');
 return token;
}
export const sessionPayments=(id:number,token:string|null)=>request<SessionPayments>(base(id),{token:requireToken(token)});
export const setPaymentMethod=(id:number,method:PaymentMethod|null,phone:string|null,token:string|null)=>
 request<SessionPayments>(base(id)+'/method',{token:requireToken(token),method:'PUT',body:{method,phone}});
export const claimPayment=(id:number,paid:boolean,token:string|null)=>
 request<SessionPayments>(base(id)+'/me',{token:requireToken(token),method:'PUT',body:{paid}});
export const confirmPayment=(id:number,username:string,paid:boolean,token:string|null)=>
 request<SessionPayments>(base(id)+'/players/'+encodeURIComponent(username),{token:requireToken(token),method:'PUT',body:{paid}});
export const remindUnpaid=(id:number,token:string|null)=>
 request<SessionPayments>(base(id)+'/remind',{token:requireToken(token),method:'POST',body:{}});

/** In-app payments: MB WAY or card through the organiser's own Stripe account, marked paid on their own. */
export interface OnlinePaymentStatus{available:boolean;connected:boolean;chargesEnabled:boolean}
export const onlinePaymentStatus=(token:string|null)=>request<OnlinePaymentStatus>('/api/payments/online/status',{token:requireToken(token)});
export const onlinePaymentOnboarding=(id:number,token:string|null)=>
 request<{url:string}>('/api/payments/online/onboarding',{token:requireToken(token),method:'POST',body:{returnPath:`/menu/events/${id}`}});
export const startOnlinePayment=(id:number,token:string|null)=>
 request<{url:string}>(base(id)+'/checkout',{token:requireToken(token),method:'POST',body:{}});

export interface PreviousUnpaid{sessionId:number|null;gameDate:string|null;sport:string|null;unpaid:string[]}
export const previousUnpaid=(id:number,token:string|null)=>
 request<PreviousUnpaid>(base(id)+'/previous-unpaid',{token:requireToken(token)});

/** 912345678 → "912 345 678". */
export function phoneLabel(phone:string):string{
 return /^\d{9}$/.test(phone)?phone.slice(0,3)+' '+phone.slice(3,6)+' '+phone.slice(6):phone;
}
export function reminderBlocked(lastReminderAt:string|null,now=Date.now()):boolean{
 const last=lastReminderAt?Date.parse(lastReminderAt):NaN;
 return Number.isFinite(last)&&now-last<12*3600_000;
}
