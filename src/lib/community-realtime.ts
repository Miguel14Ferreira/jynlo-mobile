import {API_BASE,DEMO_MODE} from './api';
import {parseCommunityEnvelope,reconnectDelay} from './realtime-core.cjs';
import type {CommunityChatEntry} from './types';
/** Active-screen WebSocket, using the same AUTH envelope as Jynlo web. */
const demoListeners=new Set<{id:number;username:string;onMessage:(m:CommunityChatEntry)=>void}>();
export function notifyDemoCommunityMessage(msg:CommunityChatEntry){
 if(!DEMO_MODE)return;
 for(const listener of demoListeners)if(listener.id===msg.communityId&&listener.username!==msg.username)listener.onMessage(msg);
}
export function observeCommunityChat(options:{
 id:number;token:string;username:string;
 onMessage:(m:CommunityChatEntry)=>void;
 onStatus?:(status:'connecting'|'online'|'offline')=>void;
}):()=>void{
 const {id,token,username,onMessage,onStatus}=options;
 if(DEMO_MODE){const listener={id,username,onMessage};demoListeners.add(listener);onStatus?.('online');return()=>{demoListeners.delete(listener);};}
 let active=true,attempt=0,socket:WebSocket|null=null,reconnect:ReturnType<typeof setTimeout>|null=null;
 function connect(){
  if(!active)return;
  onStatus?.('connecting');
  const url=API_BASE.replace(/^https:/,'wss:').replace(/^http:/,'ws:')+'/ws/chat';
  let ws:WebSocket;
  try{ws=new WebSocket(url);}catch{schedule();return;}
  socket=ws;let authenticated=false;
  ws.onopen=()=>{if(!active||socket!==ws)return;try{ws.send(JSON.stringify({type:'AUTH',token}));}catch{ws.close();}};
  ws.onmessage=e=>{
   if(!active||socket!==ws)return;
   let env:any;try{env=JSON.parse(String(e.data));}catch{return;}
   if(env?.type==='AUTHENTICATED'){authenticated=true;attempt=0;onStatus?.('online');return;}
   const msg=parseCommunityEnvelope(env,authenticated,id);
   if(msg)onMessage(msg);
  };
  ws.onerror=()=>{if(active&&socket===ws)onStatus?.('offline');};
  ws.onclose=e=>{if(socket!==ws)return;socket=null;onStatus?.('offline');
   // Authentication failure: do not reconnect forever with revoked credentials.
   if(e.code===1003){active=false;return;}
   schedule();
  };
 }
 function schedule(){if(!active||reconnect!==null)return;
  onStatus?.('offline');const delay=reconnectDelay(attempt++);
  reconnect=setTimeout(()=>{reconnect=null;connect();},delay);
 }
 connect();
 return()=>{active=false;if(reconnect!==null)clearTimeout(reconnect);reconnect=null;
  const last=socket;socket=null;if(last){last.onclose=null;last.onmessage=null;last.onerror=null;last.onopen=null;last.close();}
 };
}
