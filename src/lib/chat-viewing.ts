import {useCallback,useEffect,useRef} from 'react';
import {AppState} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {DEMO_MODE,request} from './api';
import {notifyUnreadChanged} from './unread-events';

export type ViewingKind='direct'|'community'|'session'|'private'|'team';
const REFRESH_MS=20_000;

function send(kind:ViewingKind,id:string,open:boolean,token:string){
 return request('/api/messages/inbox/viewing',{token,method:'PUT',body:{kind,id,open},timeoutMs:8000}).catch(()=>{});
}

/**
 * While this chat is on screen (screen focused and app in the foreground) the server
 * creates no alerts or phone notifications for it, like Instagram. Instant on open/close.
 */
export function useChatViewing(kind:ViewingKind,id:string|number|null|undefined,token:string|null,enabled=true){
 const key=id===null||id===undefined?'':String(id);
 const state=useRef<{open:boolean;at:number}>({open:false,at:0});
 const focused=useRef(false);
 const sync=useCallback((force=false)=>{
  if(DEMO_MODE||!token||!key)return;
  const wantOpen=enabled&&focused.current&&AppState.currentState==='active';
  const now=Date.now();
  if(wantOpen&&(force||!state.current.open||now-state.current.at>REFRESH_MS)){
   state.current={open:true,at:now};void send(kind,key,true,token);notifyUnreadChanged();
  }else if(!wantOpen&&state.current.open){
   state.current={open:false,at:now};void send(kind,key,false,token);
  }
 },[kind,key,token,enabled]);
 useFocusEffect(useCallback(()=>{
  focused.current=true;sync(true);
  const timer=setInterval(()=>sync(),5_000);
  const sub=AppState.addEventListener('change',()=>sync(true));
  return()=>{focused.current=false;clearInterval(timer);sub.remove();sync();};
 },[sync]));
 useEffect(()=>()=>{focused.current=false;sync();},[sync]);
}
