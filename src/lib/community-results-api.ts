import {request,DEMO_MODE} from './api';
export type CommunityResultEntry={username:string|null;fullName:string|null;team:string|null;result:'WIN'|'DRAW'|'LOSS';goals:number;assists:number};
export type CommunityResultRound={id:number;name:string;playedAt:string;sport:string|null;eventType:string|null;teamScore:{sideA:number;sideB:number}|null;entries:CommunityResultEntry[]};
export type CommunitySeason={id:number;name?:string|null;label?:string|null;sport?:string|null;active?:boolean};
export type CommunityStanding={position:number;username:string|null;fullName:string|null;games:number;wins:number;draws:number;losses:number;points:number;goals:number;assists:number};
export type CommunityCompetitionSettings={rankingsEnabled:boolean;winPoints:number;drawPoints:number;lossPoints:number;overallStandingsEnabled?:boolean};
export type CommunityResultsOverview={rounds:CommunityResultRound[];standings:CommunityStanding[];seasons:CommunitySeason[];activeSeasonId:number|null;selectedSeasonId:number|null;
 settings?:CommunityCompetitionSettings;sportStandings?:unknown[];racketStandings?:unknown[];raceStandings?:unknown[];overallStandings?:unknown[]};
export async function communityResultsOverview(communityId:number,token:string|null,seasonId?:number|null):Promise<CommunityResultsOverview>{
 if(!Number.isSafeInteger(communityId)||communityId<=0)throw Error('Comunidade inválida.');
 if(!token||DEMO_MODE)throw Error('Inicia sessão para consultar as classificações.');
 if(seasonId!=null&&(!Number.isSafeInteger(seasonId)||seasonId<=0))throw Error('Época inválida.');
 const season=seasonId==null?'':'?seasonId='+encodeURIComponent(String(seasonId));
 return request<CommunityResultsOverview>('/api/communities/'+communityId+'/competition'+season,{token});
}

function communityPath(communityId:number){
 if(!Number.isSafeInteger(communityId)||communityId<=0)throw Error('Comunidade inválida.');
 return '/api/communities/'+communityId;
}
/** Organizers only (the server checks): a blank sport creates a season for every sport. */
export async function createCommunitySeason(communityId:number,token:string|null,input:{name:string;sport:string|null}):Promise<CommunitySeason>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para gerir épocas.');
 return request<CommunitySeason>(communityPath(communityId)+'/seasons',{token,method:'POST',
  body:{name:input.name,startsAt:new Date().toISOString(),sport:input.sport}});
}
export async function closeCommunitySeason(communityId:number,token:string|null,seasonId:number):Promise<CommunitySeason>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para gerir épocas.');
 if(!Number.isSafeInteger(seasonId)||seasonId<=0)throw Error('Época inválida.');
 return request<CommunitySeason>(communityPath(communityId)+'/seasons/'+seasonId+'/close',{token,method:'POST'});
}
export async function setOverallStandings(communityId:number,token:string|null,enabled:boolean):Promise<CommunityCompetitionSettings>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para gerir épocas.');
 return request<CommunityCompetitionSettings>(communityPath(communityId)+'/competition/settings',{token,method:'PUT',
  body:{overallStandingsEnabled:enabled}});
}
