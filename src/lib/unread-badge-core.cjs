'use strict';
/** Total for the Messages tab badge: unread messages in conversations that are not muted. */
function badgeTotal(inboxes,mutes){
 const muted=new Set((Array.isArray(mutes)?mutes:[]).map(m=>m&&m.kind+':'+String(m.id).toLowerCase()));
 let total=0;
 for(const list of inboxes||[]){
  for(const item of Array.isArray(list)?list:[]){
   if(!item||muted.has(item.kind+':'+String(item.id).toLowerCase()))continue;
   const n=item.unreadCount;
   if(Number.isSafeInteger(n)&&n>0)total+=n;
  }
 }
 return total;
}
module.exports={badgeTotal};
