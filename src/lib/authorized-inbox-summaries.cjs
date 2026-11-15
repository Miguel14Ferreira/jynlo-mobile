'use strict';

/**
 * Only show conversations listed by an independently authenticated membership
 * or session roster. A summaries API response is never permission evidence.
 * Failing closed also protects against unexpected backend payload shapes.
 */
function filterAuthorizedSummaries(kind,allowed,raw,fallbackTitle){
 if((kind!=='community'&&kind!=='session')||!(allowed instanceof Map)||!Array.isArray(raw))return [];
 const seen=new Set();
 const result=[];
 for(const item of raw){
  if(!item||typeof item!=='object'||item.kind!==kind||typeof item.id!=='string'||
     !allowed.has(item.id)||seen.has(item.id))continue;
  // Do not render fabricated unread counters or malformed summary metadata.
  if(!Number.isSafeInteger(item.unreadCount)||item.unreadCount<0||
     !(item.latestMessageId===null||(Number.isSafeInteger(item.latestMessageId)&&item.latestMessageId>0))||
     !(item.latestText===null||typeof item.latestText==='string')||
     !(item.latestSender===null||typeof item.latestSender==='string')||
     !(item.latestAt===null||typeof item.latestAt==='string'))continue;
  seen.add(item.id);
  const title=allowed.get(item.id);
  result.push({...item,title:typeof title==='string'&&title.trim()?title:fallbackTitle});
 }
 return result;
}
module.exports={filterAuthorizedSummaries};
