import * as SecureStore from 'expo-secure-store';
import {DEMO_MODE,request} from './api';

export interface PostGameCommunity{id:number;name:string;requiresApproval:boolean;}
const vid=(n:number)=>{if(!Number.isSafeInteger(n)||n<=0)throw Error('Identificador inválido.');return n;};
/** Server-verified: only players marked present in a completed game get suggestions. */
export async function postGameCommunities(sessionId:number,token:string):Promise<PostGameCommunity[]>{
 if(DEMO_MODE||!token)return [];
 const r=await request<PostGameCommunity[]>(`/api/sessions/${vid(sessionId)}/post-game-communities`,{token});
 return Array.isArray(r)?r.filter(g=>g&&Number.isSafeInteger(g.id)&&g.id>0&&typeof g.name==='string'):[];
}
export async function joinAfterGame(sessionId:number,communityId:number,token:string):Promise<'JOINED'|'REQUESTED'>{
 if(DEMO_MODE||!token)throw Error('Inicia sessão para aderir.');
 const r=await request<{communityId:number;state:string}>(`/api/sessions/${vid(sessionId)}/post-game-communities/${vid(communityId)}/join`,{token,method:'POST'});
 return r?.state==='REQUESTED'?'REQUESTED':'JOINED';
}
/** "Agora não" is remembered on this phone, per account, like the web. */
const key=(username:string,id:number)=>'jynlo.postgame-dismissed.v1.'+username.toLowerCase().replace(/[^a-z0-9_.-]/g,'_')+'.'+id;
export async function wasDismissed(username:string,id:number):Promise<boolean>{
 try{return (await SecureStore.getItemAsync(key(username,id)))==='1';}catch{return false;}
}
export async function dismiss(username:string,id:number):Promise<void>{
 try{await SecureStore.setItemAsync(key(username,id),'1');}catch{}
}
