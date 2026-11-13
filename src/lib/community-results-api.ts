import {request,DEMO_MODE} from './api';
export type CommunityResultEntry={username:string|null;fullName:string|null;team:string|null;result:'WIN'|'DRAW'|'LOSS';goals:number;assists:number};
export type CommunityResultRound={id:number;name:string;playedAt:string;sport:string|null;eventType:string|null;teamScore:{sideA:number;sideB:number}|null;entries:CommunityResultEntry[]};
export type CommunitySeason={id:number;name?:string|null;label?:string|null;sport?:string|null;active?:boolean};
export type CommunityStanding={position:number;username:string|null;fullName:string|null;games:number;wins:number;draws:number;losses:number;points:number;goals:number;assists:number};
export type CommunityResultsOverview={rounds:CommunityResultRound[];standings:CommunityStanding[];seasons:CommunitySeason[];activeSeasonId:number|null;selectedSeasonId:number|null};
export async function communityResultsOverview(communityId:number,token:string|null,seasonId?:number|null):Promise<CommunityResultsOverview>{
 if(!Number.isSafeInteger(communityId)||communityId<=0)throw Error('Comunidade inválida.');
 if(!token||DEMO_MODE)throw Error('Inicia sessão para consultar as classificações.');
 if(seasonId!=null&&(!Number.isSafeInteger(seasonId)||seasonId<=0))throw Error('Época inválida.');
 const season=seasonId==null?'':'?seasonId='+encodeURIComponent(String(seasonId));
 return request<CommunityResultsOverview>('/api/communities/'+communityId+'/competition'+season,{token});
}
