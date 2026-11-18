import {DEMO_MODE,request} from './api';

/** Mobile parity with the authenticated personal Live API used by Jynlo Web. */
export type PersonalLiveEvent={
 id:number;username:string;avatarUrl:string|null;title:string;
 status:'LIVE'|'ENDED';startedAt:string;canManage:boolean;
};
export type PersonalLiveConnection={
 serverUrl:string;token:string;role:'HOST'|'VIEWER'|'GUEST';expiresAt:string;
};
export type PersonalLiveMessage={
 id:number;username:string;message:string;createdAt:string;
};
export type PersonalLiveControls={
 chatEnabled:boolean;mutedByHost:boolean;guestUsername:string|null;isGuest:boolean;
 mutedUsernames:string[];requestStatus:string|null;
 pendingRequests:Array<{id:number;username:string;status:string;createdAt:string}>;
 slowModeSeconds?:number;
};
const idPath=(id:number)=>{
 if(!Number.isSafeInteger(id)||id<=0)throw Error('Direto inválido.');
 return '/api/live/'+id;
};
const authenticated=(token:string)=>{
 if(!token||DEMO_MODE)throw Error('Inicia sessão na Jynlo para aceder aos diretos.');
 return token;
};
export const activePersonalLives=(token:string)=>request<PersonalLiveEvent[]>('/api/live',{token:authenticated(token)});
export const startPersonalLive=(token:string,title:string)=>{
 const trimmed=title.trim();
 if(trimmed.length<1||trimmed.length>120)throw Error('Indica um título entre 1 e 120 caracteres.');
 return request<PersonalLiveEvent>('/api/live',{method:'POST',token:authenticated(token),body:{title:trimmed}});
};
export const joinPersonalLive=(token:string,id:number)=>
 request<PersonalLiveConnection>(idPath(id)+'/join',{method:'POST',token:authenticated(token),body:{}});
export const heartbeatPersonalLive=(token:string,id:number)=>
 request<void>(idPath(id)+'/heartbeat',{method:'POST',token:authenticated(token),body:{}});
export const endPersonalLive=(token:string,id:number)=>
 request<PersonalLiveEvent>(idPath(id)+'/end',{method:'POST',token:authenticated(token),body:{}});
export const personalLiveMessages=(token:string,id:number)=>
 request<PersonalLiveMessage[]>(idPath(id)+'/messages',{token:authenticated(token)});
export const sendPersonalLiveMessage=(token:string,id:number,message:string)=>{
 const trimmed=message.trim();
 if(!trimmed||trimmed.length>500)throw Error('A mensagem deve ter entre 1 e 500 caracteres.');
 return request<PersonalLiveMessage>(idPath(id)+'/messages',{method:'POST',token:authenticated(token),body:{message:trimmed}});
};
export const personalLiveControls=(token:string,id:number)=>
 request<PersonalLiveControls>(idPath(id)+'/controls',{token:authenticated(token)});
export const requestPersonalLiveGuest=(token:string,id:number)=>
 request<{id:number;username:string;status:string}>(idPath(id)+'/guest-requests',{method:'POST',token:authenticated(token),body:{}});

export const setPersonalLiveChatEnabled=(token:string,id:number,enabled:boolean)=>
 request<PersonalLiveControls>(idPath(id)+'/chat',{method:'PUT',token:authenticated(token),body:{enabled}});
export const decidePersonalLiveGuest=(token:string,id:number,requestId:number,approve:boolean)=>{
 if(!Number.isSafeInteger(requestId)||requestId<=0)throw Error('Pedido inválido.');
 return request<{id:number;username:string;status:string}>(
  idPath(id)+'/guest-requests/'+requestId+(approve?'/approve':'/decline'),
  {method:'POST',token:authenticated(token),body:{}});
};
