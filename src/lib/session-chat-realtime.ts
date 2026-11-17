import {API_BASE,DEMO_MODE} from './api';
import {reconnectDelay} from './realtime-core.cjs';

type Status='connecting'|'online'|'offline';
/** A socket event is only a hint; the caller must fetch authorized HTTP history.
 * Never trust or display message bodies from a WebSocket event directly.
 */
export function observeSessionChat(options:{
 sessionId:number;token:string;onInvalidated:()=>void;
 onStatus?:(status:Status)=>void;
}):()=>void{
 const {sessionId,token,onInvalidated,onStatus}=options;
 if(DEMO_MODE||!token||!Number.isSafeInteger(sessionId)||sessionId<=0)return()=>{};
 let active=true,attempt=0,socket:WebSocket|null=null;
 let reconnect:ReturnType<typeof setTimeout>|null=null;
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
   let parsed:unknown;try{parsed=JSON.parse(String(event.data));}catch{return;}
   if(!parsed||typeof parsed!=='object')return;
   const envelope=parsed as Record<string,unknown>;
   if(envelope.type==='AUTHENTICATED'){
    if(!authenticated){authenticated=true;attempt=0;onStatus?.('online');onInvalidated();}
    return;
   }
   if(!authenticated||envelope.type!=='SESSION_CHAT_MESSAGE')return;
   const message=envelope.message;
   if(!message||typeof message!=='object')return;
   if((message as Record<string,unknown>).sessionId!==sessionId)return;
   onInvalidated();
  };
  ws.onerror=()=>{if(active&&socket===ws)onStatus?.('offline');};
  ws.onclose=event=>{if(socket!==ws)return;
   socket=null;onStatus?.('offline');
   if(event.code===1003){active=false;return;}
   schedule();
  };
 }
 connect();
 return()=>{
  active=false;if(reconnect!==null)clearTimeout(reconnect);reconnect=null;
  const old=socket;socket=null;
  if(old){old.onopen=null;old.onclose=null;old.onmessage=null;old.onerror=null;old.close();}
 };
}
