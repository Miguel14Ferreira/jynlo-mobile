import {DEMO_MODE,request} from './api';
export type PlayerStats={games:number;wins:number;goals:number;assists:number;mvps:number};
export type MonthLeader={name:string;username:string|null;games:number;goals:number;assists:number;mvps:number;score:number};
const safeUser=(u:string)=>{if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(u.trim()))throw new Error('Utilizador inválido.');return encodeURIComponent(u.trim());};
export async function playerStats(username:string,token:string|null):Promise<PlayerStats|null>{
 if(DEMO_MODE||!token)return null;
 return request<PlayerStats>(`/api/players/${safeUser(username)}/stats`,{token});
}
export type MonthLeaders={month:string;leaders:MonthLeader[];enabled?:boolean;canManage?:boolean};
export async function communityMonthLeaders(communityId:number,token:string|null):Promise<MonthLeaders|null>{
 if(DEMO_MODE||!token||!Number.isSafeInteger(communityId)||communityId<=0)return null;
 return request<MonthLeaders>(`/api/communities/${communityId}/month-leaders`,{token});
}
/** Owner/Admin: the community decides whether to use the month highlights. */
export async function setMonthHighlights(communityId:number,enabled:boolean,token:string):Promise<MonthLeaders>{
 return request<MonthLeaders>(`/api/communities/${communityId}/month-highlights`,{token,method:'PUT',body:{enabled}});
}
export async function playerOfMonthPoll(communityId:number,token:string):Promise<void>{
 await request<unknown>(`/api/communities/${communityId}/player-of-month-poll`,{token,method:'POST'});
}
