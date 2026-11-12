'use strict';
const MAX_ENTRIES=40;
function feedEntryKey(item){
 if(!item||typeof item!=='object')return null;
 const id=item.type==='POST'?item.postId:item.sessionId;
 if(!Number.isSafeInteger(id)||id<=0)return null;
 if(item.type==='POST')return 'post:'+id;
 if(item.type==='SESSION_ATTENDED')return 'attendance:'+id;
 if(item.type==='SESSION_CREATED'){
   const author=typeof item.authorUsername==='string'?item.authorUsername.trim().toLowerCase():'';
   return author?'created:'+id+':'+author:null;
 }
 return null;
}
function normalizeHiddenEntries(value){
 if(!Array.isArray(value))return [];
 return [...new Set(value.filter(v=>typeof v==='string'&&v.length<=150&&
   /^(post|attendance|created):[1-9][0-9]*(?::[a-z0-9_.@-]{1,128})?$/.test(v)))].slice(-MAX_ENTRIES);
}
function hideEntry(keys,key){return normalizeHiddenEntries([...keys,key]);}
function showEntry(keys,key){return normalizeHiddenEntries(keys.filter(k=>k!==key));}
module.exports={feedEntryKey,normalizeHiddenEntries,hideEntry,showEntry,MAX_ENTRIES};
