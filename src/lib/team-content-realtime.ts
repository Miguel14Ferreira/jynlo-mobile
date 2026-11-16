import {API_BASE,DEMO_MODE} from './api';
import {reconnectDelay} from './realtime-core.cjs';

type Status='connecting'|'online'|'offline';
/** The backend sends no private content; an authenticated HTTP refresh is mandatory. */
export function observeTeamContent(options:{
 teamId:number;kind:'chat'|'feed';token:string;
 onInvalidated:()=>void;onStatus?:(status:Status)=>void;
}):()=>void{
 const {teamId,kind,token,onInvalidated,onStatus}=options;
 if(DEMO_MODE||!token||!Number.isSafeInteger(teamId)||teamId<=0)
  return()=>{};
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
  socket=ws;
  let authenticated=false;
  ws.onopen=()=>{
   if(!active||socket!==ws)return;
   try{ws.send(JSON.stringify({type:'AUTH',token}));}catch{ws.close();}
  };
  ws.onmessage=e=>{
   if(!active||socket!==ws)return;
   let event:unknown;
   try{event=JSON.parse(String(e.data));}catch{return;}
   if(!event||typeof event!=='object')return;
   const envelope=event as Record<string,unknown>;
   if(envelope.type==='AUTHENTICATED'){
    if(!authenticated){authenticated=true;attempt=0;onStatus?.('online');onInvalidated();}
    return;
   }
   if(!authenticated||envelope.type!=='TEAM_CONTENT_INVALIDATED')return;
   if(envelope.teamId!==teamId||envelope.kind!==kind)return;
   onInvalidated();
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
  if(reconnect!==null)clearTimeout(reconnect);
  reconnect=null;
  const old=socket;socket=null;
  if(old){old.onclose=null;old.onmessage=null;old.onerror=null;old.onopen=null;old.close();}
 };
}
