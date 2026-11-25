import {request} from './api';

/** Server-side admin checks decide everything; the app only hides the entry for others. */
export async function hasAdminAccess(token:string):Promise<boolean>{
 try{await request<void>('/api/admin/access',{token});return true;}catch{return false;}
}
export type AdminReport={id:number;reporterUsername:string;reportedUsername:string;reason:string;status:string;createdAt:string};
export function openReports(token:string){return request<AdminReport[]>('/api/admin/reports/users',{token});}
export function closeReport(id:number,status:'REVIEWED'|'DISMISSED',token:string){
 return request<AdminReport>('/api/admin/reports/users/'+id+'/status',{token,method:'PUT',body:{status}});
}
export type RecentAccount={id:number;username:string;fullName:string|null;email:string|null;joinedAt:string|null;
 lastLoginAt:string|null;emailConfirmed:boolean;hasPhoto:boolean;suspendedAt:string|null;locked:boolean;flags:string[]};
export function recentAccounts(days:number,token:string){return request<RecentAccount[]>('/api/admin/players/recent?days='+days,{token});}
export type AdminPlayer={id:number;username:string;fullName:string|null;moderationSuspendedAt?:string|null};
export function searchPlayers(name:string,token:string){
 return request<{players:AdminPlayer[];hasMore:boolean}>('/api/admin/players?page=0&name='+encodeURIComponent(name.trim()),{token});
}
export function moderatePlayer(id:number,action:'SUSPEND'|'REINSTATE',expectedUsername:string,expectedSuspended:boolean,reason:string,token:string){
 return request<{id:number;moderationSuspendedAt:string|null}>('/api/admin/players/'+id+'/moderation',
  {token,method:'POST',body:{action,expectedUsername,expectedSuspended,reason}});
}
