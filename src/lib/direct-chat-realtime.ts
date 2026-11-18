import {API_BASE,DEMO_MODE} from './api';
import {reconnectDelay} from './realtime-core.cjs';

type Status='connecting'|'online'|'offline';
/** Private chat push is a hint only. All content is fetched through the
 * authenticated, block-aware HTTP endpoint. Never render WebSocket payloads.
 */
export function observeDirectChat(options:{
 peer:string;self:string;token:string;onInvalidated:()=>void;
 onStatus?:(status:Status)=>void;
}):()=>void{
 const {peer,self,token,onInvalidated,onStatus}=options;
 if(DEMO_MODE||!token||!/^[a-zA-Z0-9._-]{1,128}$/.test(peer)||
   !/^[a-zA-Z0-9._-]{1,128}$/.test(self)||peer.toLowerCase()===self.toLowerCase())return()=>{};
 const other=peer.toLowerCase(),me=self.toLowerCase();
 let active=true,attempt=0,socket:WebSocket|null=null;
 let reconnect:ReturnType<typeof setTimeout>|null=null;
 let lastHint=0;
 function invalidate(){
  const now=Date.now();
  if(now-lastHint<150)return;
  lastHint=now;onInvalidated();
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
   if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return;
   const envelope=parsed as Record<string,unknown>;
   if(envelope.type==='AUTHENTICATED'){
    if(!authenticated){authenticated=true;attempt=0;onStatus?.('online');invalidate();}
    return;
   }
   if(!authenticated)return;
   if(envelope.type==='CHAT_READ_RECEIPT'){
    const receipt=envelope.receipt;
    if(receipt&&typeof receipt==='object'&&
      (receipt as Record<string,unknown>).peerUsername?.toString().toLowerCase()===other)
      invalidate();
    return;
   }
   if(envelope.type!=='CHAT_MESSAGE')return;
   const message=envelope.message;
   if(!message||typeof message!=='object'||Array.isArray(message))return;
   const item=message as Record<string,unknown>;
   if(typeof item.username1!=='string'||typeof item.username2!=='string')return;
   const sender=item.username1.toLowerCase(),recipient=item.username2.toLowerCase();
   if((sender===other&&recipient===me)||(sender===me&&recipient===other))invalidate();
  };
  ws.onerror=()=>{if(active&&socket===ws)onStatus?.('offline');};
  ws.onclose=e=>{
   if(socket!==ws)return;
   socket=null;onStatus?.('offline');
   if(e.code===1003){active=false;return;}
   schedule();
  };
 }
 connect();
 return()=>{
  active=false;
  if(reconnect!==null)clearTimeout(reconnect);reconnect=null;
  const old=socket;socket=null;
  if(old){old.onopen=null;old.onclose=null;old.onmessage=null;old.onerror=null;old.close();}
 };
}
