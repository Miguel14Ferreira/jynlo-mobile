import {useEffect,useState} from 'react';
import {isOffline} from './offline-core.cjs';

// One shared view of the connection for the whole app: the system network state
// (expo-network) plus whether a screen is currently showing saved data.

type Status={offline:boolean;savedSince:number|null};
let status:Status={offline:false,savedSince:null};
const listeners=new Set<(s:Status)=>void>();
function publish(next:Status){status=next;listeners.forEach(l=>l(status));}

export function currentlyOffline():boolean{return status.offline;}
export function setOffline(offline:boolean){
 if(status.offline===offline)return;
 // Back online: saved data will be replaced by the next refresh.
 publish({offline,savedSince:offline?status.savedSince:null});
}
/** A screen fell back to saved data from this time. */
export function markShowingSaved(savedAt:number){publish({offline:true,savedSince:Math.min(savedAt,status.savedSince??savedAt)});}

let started=false;
/** Starts listening to the system network state once (safe to call many times). */
export function startNetworkMonitoring(){
 if(started)return;
 started=true;
 void (async()=>{
  try{
   const Network=await import('expo-network');
   const first=await Network.getNetworkStateAsync();
   setOffline(isOffline(first));
   Network.addNetworkStateListener(state=>setOffline(isOffline(state)));
  }catch{
   // Without the native module (old builds, web) we rely on request failures only.
  }
 })();
}

export function useNetworkStatus():Status{
 const [value,setValue]=useState(status);
 useEffect(()=>{listeners.add(setValue);setValue(status);return()=>{listeners.delete(setValue);};},[]);
 return value;
}

/** Calls `refresh` when the connection comes back (offline → online). */
export function useRefreshOnReconnect(refresh:()=>void){
 const {offline}=useNetworkStatus();
 const [wasOffline,setWasOffline]=useState(offline);
 useEffect(()=>{
  if(offline){setWasOffline(true);return;}
  if(wasOffline){setWasOffline(false);refresh();}
 },[offline,wasOffline,refresh]);
}
