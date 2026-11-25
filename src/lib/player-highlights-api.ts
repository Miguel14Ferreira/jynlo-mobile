import {DEMO_MODE,request} from './api';
export type PlayerStats={games:number;wins:number;goals:number;assists:number;mvps:number};
export type MonthLeader={name:string;username:string|null;games:number;goals:number;assists:number;mvps:number;score:number};
const safeUser=(u:string)=>{if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(u.trim()))throw new Error('Utilizador inválido.');return encodeURIComponent(u.trim());};
export async function playerStats(username:string,token:string|null):Promise<PlayerStats|null>{
 if(DEMO_MODE||!token)return null;
 return request<PlayerStats>(`/api/players/${safeUser(username)}/stats`,{token});
}
export async function communityMonthLeaders(communityId:number,token:string|null):Promise<MonthLeader[]>{
 if(DEMO_MODE||!token||!Number.isSafeInteger(communityId)||communityId<=0)return [];
 const r=await request<{month:string;leaders:MonthLeader[]}>(`/api/communities/${communityId}/month-leaders`,{token});
 return r?.leaders??[];
}
export async function playerOfMonthPoll(communityId:number,token:string):Promise<void>{
 await request<unknown>(`/api/communities/${communityId}/player-of-month-poll`,{token,method:'POST'});
}
