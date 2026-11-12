import * as SecureStore from 'expo-secure-store';
import {normalizeHiddenEntries} from './feed-visibility.cjs';

const PARTS=4;
const PER_PART=10;
function storageKey(username:string,part:number):string {
 if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(username))throw Error('Conta Jynlo inválida.');
 return 'jynlo.hidden-feed.v1.'+username.toLowerCase()+':'+part;
}
/** Device-local, per-account preferences; never changes the author's content. */
export async function readHiddenFeedEntries(username:string):Promise<string[]> {
 const values=await Promise.all(Array.from({length:PARTS},(_,part)=>
   SecureStore.getItemAsync(storageKey(username,part)).catch(()=>null)));
 const records:string[]=[];
 for(const value of values){
   if(!value)continue;
   try{const chunk:unknown=JSON.parse(value);if(Array.isArray(chunk))records.push(...chunk);}catch{}
 }
 return normalizeHiddenEntries(records);
}
export async function writeHiddenFeedEntries(username:string,entries:string[]):Promise<void> {
 const normalized=normalizeHiddenEntries(entries);
 for(let part=0;part<PARTS;part++){
   const chunk=normalized.slice(part*PER_PART,(part+1)*PER_PART);
   await SecureStore.setItemAsync(storageKey(username,part),JSON.stringify(chunk));
 }
}
