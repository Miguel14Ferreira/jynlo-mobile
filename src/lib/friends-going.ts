import {useEffect,useState} from 'react';
import {request} from './api';

export type FriendGoing={username:string;fullName:string|null;profilePicUrl:string|null};
export type SessionFriends={sessionId:number;count:number;friends:FriendGoing[]};

const TTL_MS=3*60*1000;
const cache=new Map<number,{at:number;value:Promise<SessionFriends|null>}>();
let pending:{id:number;resolve:(v:SessionFriends|null)=>void}[]=[];
let timer:ReturnType<typeof setTimeout>|null=null;
let currentToken:string|null=null;

function flush(){
 timer=null;
 const batch=pending.slice(0,100);pending=pending.slice(100);
 if(pending.length)timer=setTimeout(flush,40);
 const token=currentToken;
 const ids=[...new Set(batch.map(x=>x.id))];
 if(!token||!ids.length){batch.forEach(x=>x.resolve(null));return;}
 request<SessionFriends[]>('/api/sessions/friends-going?ids='+ids.join(','),{token})
  .then(list=>{const by=new Map((list??[]).map(x=>[x.sessionId,x]));batch.forEach(x=>x.resolve(by.get(x.id)??null));})
  .catch(()=>batch.forEach(x=>x.resolve(null)));
}

/** Friends in one game; ids asked at the same moment go in one request, answers kept for a few minutes. */
export function friendsGoing(sessionId:number,token:string|null):Promise<SessionFriends|null>{
 if(!token||!sessionId)return Promise.resolve(null);
 if(currentToken!==token){cache.clear();currentToken=token;}
 const hit=cache.get(sessionId);
 if(hit&&Date.now()-hit.at<TTL_MS)return hit.value;
 const value=new Promise<SessionFriends|null>(resolve=>{pending.push({id:sessionId,resolve});if(!timer)timer=setTimeout(flush,40);});
 cache.set(sessionId,{at:Date.now(),value});
 return value;
}

export function useFriendsGoing(sessionId:number,token:string|null):SessionFriends|null{
 const [data,setData]=useState<SessionFriends|null>(null);
 useEffect(()=>{
  let alive=true;setData(null);
  friendsGoing(sessionId,token).then(d=>{if(alive)setData(d&&d.count>0?d:null);});
  return()=>{alive=false;};
 },[sessionId,token]);
 return data;
}

/** Games with friends first; otherwise the original order. */
export async function friendsFirst<T extends {id:number}>(list:T[],token:string|null):Promise<T[]>{
 if(!token||!list.length)return list;
 const results=await Promise.all(list.slice(0,100).map(s=>friendsGoing(s.id,token)));
 const has=new Set(results.filter(r=>r&&r.count>0).map(r=>r!.sessionId));
 if(!has.size)return list;
 return list.map((item,index)=>({item,index,h:has.has(item.id)}))
  .sort((a,b)=>a.h===b.h?a.index-b.index:a.h?-1:1).map(x=>x.item);
}

export function friendsGoingLabel(d:SessionFriends,t:(k:string,p?:Record<string,string|number>)=>string):string{
 const f=d.friends[0];
 const name=(f?.fullName?.trim().split(/\s+/)[0])||f?.username||'';
 if(d.count<=1)return t('{name} vai',{name});
 if(d.count===2)return t('{name} e mais 1 amigo vão',{name});
 return t('{name} e mais {n} amigos vão',{name,n:d.count-1});
}
