'use strict';
const {tr}=require('./i18n-core.cjs');
// Offline helpers: what counts as "no connection", and which saved snapshots
// are still worth showing. Pure, so they are tested without React Native.

const MAX_AGE_MS=7*24*60*60*1000;

/** Network state from expo-network: offline only when the system says so. */
function isOffline(state){
 if(!state||typeof state!=='object')return false;
 if(state.isConnected===false)return true;
 // isInternetReachable can be null while unknown: do not treat that as offline.
 return state.isInternetReachable===false;
}

/** File name for a snapshot of one screen for one account (no raw usernames on disk). */
function snapshotName(kind,owner){
 const safeKind=String(kind||'').replace(/[^a-z0-9-]/gi,'').slice(0,40)||'data';
 let h=2166136261;
 for(const ch of String(owner||'visitor').toLowerCase()){h^=ch.codePointAt(0);h=Math.imul(h,16777619)>>>0;}
 return 'jynlo-offline-'+safeKind+'-'+h.toString(16)+'.json';
}

/** A saved snapshot to show, or null when missing, damaged, for another account or too old. */
function usableSnapshot(raw,owner,now=Date.now(),maxAge=MAX_AGE_MS){
 if(typeof raw!=='string'||!raw)return null;
 let parsed;
 try{parsed=JSON.parse(raw);}catch{return null;}
 if(!parsed||typeof parsed!=='object'||parsed.v!==1)return null;
 if(String(parsed.owner||'')!==String(owner||'visitor').toLowerCase())return null;
 if(!Number.isFinite(parsed.savedAt)||parsed.savedAt>now+60000||now-parsed.savedAt>maxAge)return null;
 return {data:parsed.data,savedAt:parsed.savedAt};
}

function serializeSnapshot(data,owner,now=Date.now()){
 return JSON.stringify({v:1,owner:String(owner||'visitor').toLowerCase(),savedAt:now,data});
}

/** "há 5 min", "há 2 h", "a 21/11" — when the saved data is from. */
function savedLabel(savedAt,now=Date.now()){
 const minutes=Math.max(0,Math.round((now-savedAt)/60000));
 if(minutes<1)return tr('agora mesmo');
 if(minutes<60)return 'há '+minutes+' min';
 const hours=Math.round(minutes/60);
 if(hours<24)return 'há '+hours+' h';
 const d=new Date(savedAt);
 return 'a '+String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0');
}

module.exports={MAX_AGE_MS,isOffline,snapshotName,usableSnapshot,serializeSnapshot,savedLabel};
