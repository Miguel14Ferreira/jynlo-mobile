import {useCallback,useEffect,useRef,useState} from 'react';
import {API_BASE,DEMO_MODE} from './api';
import {reconnectDelay} from './realtime-core.cjs';
import {t} from './i18n';
import * as core from './chat-typing-core.cjs';

export type TypingKind='direct'|'session'|'community'|'team'|'private';

/**
 * "A escrever…" for an open chat, the same as the website: sends at most one
 * signal every 2.4 s while the person types, STOP after 3.2 s idle or on send,
 * and hides other people's state after 5 s without news. Nothing is stored.
 */
export function useChatTyping(kind:TypingKind,id:string|number|null|undefined,token:string|null|undefined,self:string|null|undefined){
 const [users,setUsers]=useState<string[]>([]);
 const socket=useRef<WebSocket|null>(null),ready=useRef(false);
 const timers=useRef(new Map<string,ReturnType<typeof setTimeout>>());
 const nextAllowed=useRef(0),idle=useRef<ReturnType<typeof setTimeout>|null>(null),typing=useRef(false);
 const key=id==null?'':String(id);
 const send=useCallback((active:boolean)=>{
  const ws=socket.current;
  if(!ws||!ready.current||ws.readyState!==1||!key)return;
  try{ws.send(JSON.stringify({type:'CHAT_TYPING',kind,id:key,active}));}catch{/* ephemeral */}
 },[kind,key]);
 const stop=useCallback(()=>{
  if(idle.current)clearTimeout(idle.current);idle.current=null;
  if(typing.current)send(false);
  typing.current=false;nextAllowed.current=0;
 },[send]);
 const onInput=useCallback((text:string)=>{
  if(!text.trim()){stop();return;}
  const now=Date.now();
  if(now>=nextAllowed.current){send(true);typing.current=true;nextAllowed.current=now+2400;}
  if(idle.current)clearTimeout(idle.current);
  idle.current=setTimeout(stop,3200);
 },[send,stop]);

 useEffect(()=>{
  if(DEMO_MODE||!token||!key)return;
  let active=true,attempt=0,reconnect:ReturnType<typeof setTimeout>|null=null;
  const clearAll=()=>{for(const h of timers.current.values())clearTimeout(h);timers.current.clear();setUsers([]);};
  function schedule(){if(!active||reconnect)return;reconnect=setTimeout(()=>{reconnect=null;connect();},reconnectDelay(attempt++));}
  function connect(){
   if(!active)return;
   let ws:WebSocket;
   try{ws=new WebSocket(API_BASE.replace(/^https:/,'wss:').replace(/^http:/,'ws:')+'/ws/chat');}catch{schedule();return;}
   socket.current=ws;ready.current=false;
   ws.onopen=()=>{try{ws.send(JSON.stringify({type:'AUTH',token}));}catch{ws.close();}};
   ws.onmessage=ev=>{
    if(!active||socket.current!==ws)return;
    let env:any;try{env=JSON.parse(String(ev.data));}catch{return;}
    if(env?.type==='AUTHENTICATED'){ready.current=true;attempt=0;return;}
    if(env?.type!=='CHAT_TYPING'||!core.matches(env.typing,kind,key,self||''))return;
    const name=String(env.typing.username);const lower=name.toLowerCase();
    const prev=timers.current.get(lower);if(prev)clearTimeout(prev);timers.current.delete(lower);
    if(env.typing.active){
     timers.current.set(lower,setTimeout(()=>{timers.current.delete(lower);setUsers(u=>u.filter(x=>x.toLowerCase()!==lower));},5000));
     setUsers(u=>u.some(x=>x.toLowerCase()===lower)?u:[...u,name]);
    }else setUsers(u=>u.filter(x=>x.toLowerCase()!==lower));
   };
   ws.onclose=e=>{if(socket.current!==ws)return;socket.current=null;ready.current=false;clearAll();if(e.code===1003)return;schedule();};
   ws.onerror=()=>{};
  }
  connect();
  return()=>{
   active=false;if(reconnect)clearTimeout(reconnect);
   if(idle.current)clearTimeout(idle.current);idle.current=null;
   const ws=socket.current;socket.current=null;
   if(ws){
    try{if(typing.current&&ready.current&&ws.readyState===1)ws.send(JSON.stringify({type:'CHAT_TYPING',kind,id:key,active:false}));}catch{/* closing */}
    ws.onopen=null;ws.onclose=null;ws.onmessage=null;ws.onerror=null;ws.close();
   }
   typing.current=false;ready.current=false;clearAll();
  };
 },[kind,key,token,self]);

 return {label:core.label(kind,users,t),onInput,stop};
}
