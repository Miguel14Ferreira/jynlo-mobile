'use strict';

/** Local-only inbox controls: never query other users or infer hidden chats. */
function normalize(value){
 return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
}
function filterInbox(items,query='',unreadOnly=false){
 const needle=normalize(query);
 return items.filter(item=>{
  if(unreadOnly&&!(Number.isFinite(item.unreadCount)&&item.unreadCount>0))return false;
  if(!needle)return true;
  return [item.id,item.latestText,item.latestSender,
   item.kind==='direct'?'mensagem privada':item.kind==='community'?'comunidade':'sessao']
   .some(value=>normalize(value).includes(needle));
 });
}
function unreadInboxCount(items){
 return items.reduce((total,item)=>{
  const count=item.unreadCount;
  return total+(Number.isSafeInteger(count)&&count>0?count:0);
 },0);
}
module.exports={filterInbox,unreadInboxCount};
