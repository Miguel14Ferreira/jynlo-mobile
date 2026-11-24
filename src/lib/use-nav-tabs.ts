import {useCallback,useEffect,useState} from 'react';
import * as SecureStore from 'expo-secure-store';
import {useAuth} from './auth';
import {managedVenues} from './venue-jynlo-api';
import {resolveNavTabs} from './nav-tabs.cjs';
import {useBookingsOpen} from './use-bookings-open';

/** Saved per account on this device; the bar and the editor stay in sync. */
const listeners=new Set<(user:string,ids:string[]|null)=>void>();
function storageKey(username:string){return 'jynlo.nav-tabs.v1.'+username.toLowerCase().replace(/[^a-z0-9_.-]/g,'_');}
async function readSaved(username:string):Promise<unknown>{
 try{const raw=await SecureStore.getItemAsync(storageKey(username));return raw?JSON.parse(raw):null;}catch{return null;}
}
export async function saveNavTabs(username:string,ids:string[]|null){
 listeners.forEach(listener=>listener(username.toLowerCase(),ids));
 try{if(ids)await SecureStore.setItemAsync(storageKey(username),JSON.stringify(ids));else await SecureStore.deleteItemAsync(storageKey(username));}
 catch{/* keeps working for this session */}
}

export function useNavTabs(){
 const auth=useAuth();
 const user=auth.username?.toLowerCase()||'';
 const [saved,setSaved]=useState<unknown>(null);
 const [manager,setManager]=useState(false);
 const bookingsOpen=useBookingsOpen();
 useEffect(()=>{
  let alive=true;setSaved(null);
  if(user)void readSaved(user).then(value=>{if(alive)setSaved(value);});
  const listener=(who:string,ids:string[]|null)=>{if(who===user)setSaved(ids);};
  listeners.add(listener);
  return()=>{alive=false;listeners.delete(listener);};
 },[user]);
 const refreshManager=useCallback(()=>{
  if(!auth.token){setManager(false);return;}
  managedVenues(auth.token).then(list=>setManager((list||[]).length>0)).catch(()=>{/* not a manager, or offline */});
 },[auth.token]);
 useEffect(()=>{refreshManager();},[refreshManager]);
 return {ids:resolveNavTabs(saved,manager,bookingsOpen),manager,bookingsOpen,username:user};
}
