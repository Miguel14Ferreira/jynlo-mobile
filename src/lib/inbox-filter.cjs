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
   item.kind==='direct'?'mensagem privada':item.kind==='private'?'grupo':item.kind==='community'?'comunidade':'sessao',item.title]
   .some(value=>normalize(value).includes(needle));
 });
}
function unreadInboxCount(items){
 return items.reduce((total,item)=>{
  const count=item.unreadCount;
  return total+(Number.isSafeInteger(count)&&count>0?count:0);
 },0);
}
function formatInboxTime(value){
 if(!value)return '';
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return '';
 return date.toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}
function formatUnreadBadge(value){
 if(!Number.isSafeInteger(value)||value<=0)return '';
 return value>99?'99+':String(value);
}
module.exports={filterInbox,unreadInboxCount,formatInboxTime,formatUnreadBadge};
