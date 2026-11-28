import {DEMO_MODE,request} from './api';
import {safeId} from './community-core.cjs';

/** "Quem és tu na classificação?": a member links (or unlinks) their account to a name from the table. */
export interface HistoricalPlayerCandidate{playerId:number;historicalName:string;linkedUsername:string|null;linkStatus:'UNLINKED'|'PENDING'|'ACCEPTED'}
export interface HistoricalPlayerLink{id:number;playerId:number;historicalName:string;targetUsername:string;status:'PENDING'|'ACCEPTED'|'REJECTED'}

const base=(id:number)=>`/api/communities/${safeId(id)}/competition`;

export async function historicalCandidates(communityId:number,token:string):Promise<HistoricalPlayerCandidate[]>{
  if(DEMO_MODE)return [];
  return request<HistoricalPlayerCandidate[]>(`${base(communityId)}/historical-players`,{token});
}
export async function myHistoricalLinks(communityId:number,token:string):Promise<HistoricalPlayerLink[]>{
  if(DEMO_MODE)return [];
  return request<HistoricalPlayerLink[]>(`${base(communityId)}/historical-player-links/my-claims`,{token});
}
export async function claimHistoricalPlayer(communityId:number,playerId:number,token:string):Promise<HistoricalPlayerLink>{
  return request<HistoricalPlayerLink>(`${base(communityId)}/historical-player-links/claim`,{token,method:'POST',body:{playerId:safeId(playerId)}});
}
export async function releaseHistoricalLink(communityId:number,linkId:number,token:string):Promise<void>{
  await request<void>(`${base(communityId)}/historical-player-links/my-claims/${safeId(linkId)}`,{token,method:'DELETE',body:null});
}
