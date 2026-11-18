import {API_BASE,DEMO_MODE} from './api';
import {reconnectDelay} from './realtime-core.cjs';

/**
 * Jynlo backend emits a content-free PERSONAL_LIVE_INVALIDATED event after
 * commit. Refresh through authenticated HTTP; never trust socket payloads
 * for chat content or role / moderation permissions.
 */
export function observePersonalLives(options:{
 token:string;onInvalidated:()=>void;onStatus?:(state:'online'|'offline'|'connecting')=>void;
}):()=>void{
 const {token,onInvalidated,onStatus}=options;
 if(!token||DEMO_MODE)return()=>{};
 let active=true,attempt=0,socket:WebSocket|null=null;
 let reconnect:ReturnType<typeof setTimeout>|null=null;
 let lastRefresh=0;
 function invalidate(){
  const now=Date.now();
  if(now-lastRefresh<250)return;
  lastRefresh=now;onInvalidated();
 }
 function schedule(){
  if(!active||reconnect!==null)return;
  onStatus?.('offline');
  reconnect=setTimeout(()=>{reconnect=null;connect();},reconnectDelay(attempt++));
 }
 function connect(){
  if(!active)return;
  onStatus?.('connecting');
  const url=API_BASE.replace(/^https:/,'wss:').replace(/^http:/,'ws:')+'/ws/chat';
  let ws:WebSocket;
  try{ws=new WebSocket(url);}catch{schedule();return;}
  socket=ws;let authenticated=false;
  ws.onopen=()=>{if(!active||socket!==ws)return;
   try{ws.send(JSON.stringify({type:'AUTH',token}));}catch{ws.close();}
  };
  ws.onmessage=event=>{
   if(!active||socket!==ws)return;
   let parsed:unknown;
   try{parsed=JSON.parse(String(event.data));}catch{return;}
   if(!parsed||typeof parsed!=='object')return;
   const envelope=parsed as Record<string,unknown>;
   if(envelope.type==='AUTHENTICATED'){
    if(!authenticated){authenticated=true;attempt=0;onStatus?.('online');invalidate();}
    return;
   }
   if(authenticated&&envelope.type==='PERSONAL_LIVE_INVALIDATED')invalidate();
  };
  ws.onerror=()=>{if(active&&socket===ws)onStatus?.('offline');};
  ws.onclose=e=>{if(socket!==ws)return;socket=null;onStatus?.('offline');
   if(e.code===1003){active=false;return;}
   schedule();
  };
 }
 connect();
 return()=>{
  active=false;if(reconnect!==null)clearTimeout(reconnect);reconnect=null;
  const old=socket;socket=null;
  if(old){old.onclose=null;old.onmessage=null;old.onerror=null;old.onopen=null;old.close();}
 };
}
