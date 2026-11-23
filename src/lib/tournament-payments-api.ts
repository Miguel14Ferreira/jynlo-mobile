import {request} from './api';
import type {PaymentMethod} from './session-payments-api';

export interface TournamentPaymentPlayer{username:string;fullName:string|null;claimedAt:string|null;confirmedAt:string|null}
export interface TournamentPayments{
 entryFeeCents:number|null;method:PaymentMethod|null;mbwayPhone:string|null;organiser:boolean;participant:boolean;
 mine:{claimedAt:string|null;confirmedAt:string|null}|null;confirmedCount:number;playerCount:number;players:TournamentPaymentPlayer[];
}
const base=(communityId:number,tournamentId:number)=>`/api/communities/${communityId}/tournaments/${tournamentId}/payments`;
export const tournamentPayments=(c:number,id:number,token:string)=>request<TournamentPayments>(base(c,id),{token});
export const setTournamentPayment=(c:number,id:number,token:string,entryFeeCents:number|null,method:PaymentMethod|null,phone:string|null)=>
 request<TournamentPayments>(base(c,id),{token,method:'PUT',body:{entryFeeCents,method,phone}});
export const claimTournamentPayment=(c:number,id:number,token:string,paid:boolean)=>
 request<TournamentPayments>(base(c,id)+'/claim',{token,method:'POST',body:{paid}});
export const confirmTournamentPayment=(c:number,id:number,token:string,username:string,paid:boolean)=>
 request<TournamentPayments>(base(c,id)+'/confirm',{token,method:'POST',body:{username,paid}});
