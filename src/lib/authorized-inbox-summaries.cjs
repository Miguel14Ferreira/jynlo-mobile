'use strict';

/**
 * Only show conversations listed by an independently authenticated membership
 * or session roster. A summaries API response is never permission evidence.
 * Failing closed also protects against unexpected backend payload shapes.
 */
function validSummaryMetadata(item){
 return Number.isSafeInteger(item.unreadCount)&&item.unreadCount>=0&&
  (item.latestMessageId===null||(Number.isSafeInteger(item.latestMessageId)&&item.latestMessageId>0))&&
  (item.latestText===null||typeof item.latestText==='string')&&
  (item.latestSender===null||typeof item.latestSender==='string')&&
  (item.latestAt===null||typeof item.latestAt==='string');
}

/** Direct peers are independently authorized; IDs are case-insensitive.
 * Preserve empty authorized conversations, but never manufacture new peers.
 */
function filterAuthorizedDirectSummaries(allowed,raw){
 if(!(allowed instanceof Map)||!Array.isArray(raw))return [];
 const returned=new Set();
 const visible=[];
 for(const item of raw){
  if(!item||typeof item!=='object'||item.kind!=='direct'||typeof item.id!=='string')continue;
  const id=item.id.toLowerCase();
  if(!allowed.has(id)||returned.has(id)||!validSummaryMetadata(item))continue;
  const peer=allowed.get(id);
  if(typeof peer!=='string'||!peer)continue;
  returned.add(id);
  visible.push({...item,id:peer});
 }
 for(const [key,peer] of allowed){
  if(!returned.has(key)&&typeof peer==='string'&&peer)
   visible.push({kind:'direct',id:peer,latestMessageId:null,latestText:null,latestSender:null,
    latestAt:null,unreadCount:0});
 }
 return visible;
}

function filterAuthorizedSummaries(kind,allowed,raw,fallbackTitle){
 if((kind!=='community'&&kind!=='session')||!(allowed instanceof Map)||!Array.isArray(raw))return [];
 const seen=new Set();
 const result=[];
 for(const item of raw){
  if(!item||typeof item!=='object'||item.kind!==kind||typeof item.id!=='string'||
     !allowed.has(item.id)||seen.has(item.id))continue;
  // Do not render fabricated unread counters or malformed summary metadata.
  if(!validSummaryMetadata(item))continue;
  seen.add(item.id);
  const title=allowed.get(item.id);
  result.push({...item,title:typeof title==='string'&&title.trim()?title:fallbackTitle});
 }
 return result;
}
module.exports={filterAuthorizedSummaries,filterAuthorizedDirectSummaries};
