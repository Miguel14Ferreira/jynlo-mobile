import {DEMO_MODE,request} from './api';

/** Server-authoritative community live capabilities: only the owner can broadcast. */
export type CommunityLiveCapabilities={enabled:boolean;canManage:boolean};
export type CommunityLiveEvent={
 id:number;communityId:number;title:string;description:string|null;
 status:'SCHEDULED'|'LIVE'|'ENDED';scheduledAt:string;startedAt:string|null;
 endedAt:string|null;canManage:boolean;
};
export type CommunityLiveConnection={
 serverUrl:string;token:string;role:'HOST'|'VIEWER';expiresAt:string;
};
const base=(communityId:number)=>{
 if(!Number.isSafeInteger(communityId)||communityId<=0)throw Error('Comunidade inválida.');
 return '/api/communities/'+communityId+'/live';
};
const eventPath=(communityId:number,eventId:number)=>{
 if(!Number.isSafeInteger(eventId)||eventId<=0)throw Error('Transmissão inválida.');
 return base(communityId)+'/'+eventId;
};
const authenticated=(token:string)=>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão para aceder aos diretos da comunidade.');
 return token;
};
export const communityLiveCapabilities=(token:string,communityId:number)=>
 request<CommunityLiveCapabilities>(base(communityId)+'/capabilities',{token:authenticated(token)});
export const communityLiveEvents=(token:string,communityId:number)=>
 request<CommunityLiveEvent[]>(base(communityId),{token:authenticated(token)});
export function scheduleCommunityLive(token:string,communityId:number,title:string,description:string,scheduledAt:string){
 if(!title.trim()||title.trim().length>120)throw Error('O título deve ter entre 1 e 120 caracteres.');
 if(description.trim().length>1000)throw Error('A descrição deve ter até 1000 caracteres.');
 const stamp=Date.parse(scheduledAt);
 if(!Number.isFinite(stamp)||stamp<Date.now()-60000||stamp>Date.now()+90*86400000)
  throw Error('Escolhe uma data válida, até 90 dias no futuro.');
 return request<CommunityLiveEvent>(base(communityId),{token:authenticated(token),method:'POST',
  body:{title:title.trim(),description:description.trim(),scheduledAt:new Date(stamp).toISOString()}});
}
export const startCommunityLive=(token:string,communityId:number,eventId:number)=>
 request<CommunityLiveEvent>(eventPath(communityId,eventId)+'/start',{token:authenticated(token),method:'POST',body:{}});
export const endCommunityLive=(token:string,communityId:number,eventId:number)=>
 request<CommunityLiveEvent>(eventPath(communityId,eventId)+'/end',{token:authenticated(token),method:'POST',body:{}});
export const joinCommunityLive=(token:string,communityId:number,eventId:number)=>
 request<CommunityLiveConnection>(eventPath(communityId,eventId)+'/join',{token:authenticated(token),method:'POST',body:{}});
export const heartbeatCommunityLive=(token:string,communityId:number,eventId:number)=>
 request<void>(eventPath(communityId,eventId)+'/heartbeat',{token:authenticated(token),method:'POST',body:{}});
