import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {communityInbox,directInbox,sessionInbox,privateGroupInbox} from './chat-api';
import {listConversationMutes} from './conversation-mutes-api';
import {badgeTotal} from './unread-badge-core.cjs';
import {ApiError,DEMO_MODE,request} from './api';
import {onUnreadChanged} from './unread-events';
import {getNativeNotifications} from './optional-notifications.cjs';

const POLL_MS=30_000;
/** One request: the server sums every accessible conversation and skips muted ones. */
async function serverTotal(token:string):Promise<number|null>{
 try{
  const r=await request<{total?:number}>('/api/messages/inbox/unread-count',{token});
  return Number.isSafeInteger(r?.total)&&(r!.total as number)>=0?(r!.total as number):null;
 }catch(e){
  // Older server without the endpoint: fall back to adding the conversation summaries.
  if(e instanceof ApiError&&(e.status===404||e.status===405))return null;
  throw e;
 }
}
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
   let total:number|null=null;
   try{total=await serverTotal(token);}catch{return;} // Network failure: keep the last value.
   if(who!==identityRef.current)return;
   if(total!==null){setCount(total);return;}
   const [direct,community,session,mutes,groups]=await Promise.allSettled([directInbox(token),communityInbox(token,username),sessionInbox(token,username),listConversationMutes(token),privateGroupInbox(token)]);
   if(who!==identityRef.current)return;
   if(direct.status==='rejected'&&community.status==='rejected'&&session.status==='rejected')return;
   const ok=<T,>(r:PromiseSettledResult<T>)=>r.status==='fulfilled'?r.value:null;
   setCount(badgeTotal([ok(direct),ok(community),ok(session),ok(groups)],ok(mutes)));
  }finally{if(inFlight.current===who)inFlight.current=null;}
 },[token,username]);
 useEffect(()=>{
  setCount(0);last.current=0;
  if(!token||!username)return;
  void refresh(true);
  const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},POLL_MS);
  const sub=AppState.addEventListener('change',state=>{if(state==='active')void refresh(true);});
  // Live: a chat was read here, or a message alert arrived while the app is open.
  let soon:ReturnType<typeof setTimeout>|null=null;
  const offRead=onUnreadChanged(()=>{if(soon)clearTimeout(soon);soon=setTimeout(()=>void refresh(true),700);});
  let received:{remove:()=>void}|null=null;
  try{
   const Notifications=getNativeNotifications() as {addNotificationReceivedListener?:(cb:()=>void)=>{remove:()=>void}}|null;
   if(Notifications?.addNotificationReceivedListener)received=Notifications.addNotificationReceivedListener(()=>void refresh(true));
  }catch{/* optional native module */}
  return()=>{clearInterval(timer);sub.remove();offRead();if(soon)clearTimeout(soon);try{received?.remove();}catch{/* ignore */}};
 // identity covers account switches
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[identity]);
 return {count,refresh};
}
