import {snapshotName,serializeSnapshot,usableSnapshot} from './offline-core.cjs';
import {markShowingSaved,setOffline} from './network-status';

// Last good copy of a few screens (Explorar, As minhas sessões) in the app's
// private cache folder, per account, for up to 7 days. Never messages or chats.

async function file(kind:string,owner:string|null|undefined){
 const {File,Paths}=await import('expo-file-system');
 return new File(Paths.cache,snapshotName(kind,owner));
}

export async function saveSnapshot(kind:string,owner:string|null|undefined,data:unknown):Promise<void>{
 try{const f=await file(kind,owner);await f.write(serializeSnapshot(data,owner));}catch{/* a cache write must never break a screen */}
}

export async function loadSnapshot<T>(kind:string,owner:string|null|undefined):Promise<{data:T;savedAt:number}|null>{
 try{const f=await file(kind,owner);if(!f.exists)return null;const s=usableSnapshot(f.textSync(),owner);return s?{data:s.data as T,savedAt:s.savedAt}:null;}
 catch{return null;}
}

/** Removes every saved snapshot (logout, account deletion). */
export async function clearOfflineSnapshots():Promise<void>{
 try{
  const {Directory,Paths}=await import('expo-file-system');
  const dir=new Directory(Paths.cache);
  for(const entry of dir.list()){if(entry.name.startsWith('jynlo-offline-'))try{entry.delete();}catch{}}
 }catch{}
}

/** Network failures are not ApiErrors: the server never answered. */
export function isConnectionFailure(error:unknown):boolean{
 return error instanceof Error&&error.name!=='ApiError'&&/ligação|rede|network|demorou/i.test(error.message);
}

/**
 * Loads fresh data and saves it; when the connection fails, returns the last
 * saved copy (and tells the app it is showing saved data) instead of an error.
 */
export async function withOfflineSnapshot<T>(kind:string,owner:string|null|undefined,load:()=>Promise<T>):Promise<T>{
 try{
  const fresh=await load();
  setOffline(false);
  void saveSnapshot(kind,owner,fresh);
  return fresh;
 }catch(error){
  if(!isConnectionFailure(error))throw error;
  const saved=await loadSnapshot<T>(kind,owner);
  if(!saved){setOffline(true);throw error;}
  markShowingSaved(saved.savedAt);
  return saved.data;
 }
}
