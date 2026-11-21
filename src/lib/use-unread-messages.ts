import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {communityInbox,directInbox,sessionInbox} from './chat-api';
import {listConversationMutes} from './conversation-mutes-api';
import {badgeTotal} from './unread-badge-core.cjs';
import {DEMO_MODE} from './api';

const POLL_MS=60_000;
/** Unread messages for the tab badge. Failures keep the last known value instead of flashing 0. */
export function useUnreadMessages(token:string|null,username:string|null){
 const [count,setCount]=useState(0);
 const identity=(username||'')+'|'+(token||'');
 // A result is only discarded when the signed-in account changed while it was loading.
 const identityRef=useRef(identity);identityRef.current=identity;
 const inFlight=useRef<string|null>(null),last=useRef(0);
 const refresh=useCallback(async(force=false)=>{
  if(!token||!username||DEMO_MODE){setCount(0);return;}
  const who=(username||'')+'|'+(token||'');
  const now=Date.now();
  if(inFlight.current===who||(!force&&now-last.current<5_000))return;
  inFlight.current=who;last.current=now;
  try{
   const [direct,community,session,mutes]=await Promise.allSettled([directInbox(token),communityInbox(token,username),sessionInbox(token,username),listConversationMutes(token)]);
   if(who!==identityRef.current)return;
   if(direct.status==='rejected'&&community.status==='rejected'&&session.status==='rejected')return;
   const ok=<T,>(r:PromiseSettledResult<T>)=>r.status==='fulfilled'?r.value:null;
   setCount(badgeTotal([ok(direct),ok(community),ok(session)],ok(mutes)));
  }finally{if(inFlight.current===who)inFlight.current=null;}
 },[token,username]);
 useEffect(()=>{
  setCount(0);last.current=0;
  if(!token||!username)return;
  void refresh(true);
  const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},POLL_MS);
  const sub=AppState.addEventListener('change',state=>{if(state==='active')void refresh(true);});
  return()=>{clearInterval(timer);sub.remove();};
 // identity covers account switches
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[identity]);
 return {count,refresh};
}
