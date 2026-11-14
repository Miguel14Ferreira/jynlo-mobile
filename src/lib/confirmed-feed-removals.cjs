'use strict';
const {feedEntryKey}=require('./feed-visibility.cjs');

/** Authoritative removals must win over stale feed GET responses.
 * Attendance is scoped by session and author, not just session id. */
function removedFeedKey(item){
 if(item?.type==='SESSION_ATTENDED'&&Number.isSafeInteger(item.sessionId)&&item.sessionId>0&&
    typeof item.authorUsername==='string'&&item.authorUsername.trim())
  return 'attendance:'+item.sessionId+':'+item.authorUsername.trim().toLowerCase();
 return feedEntryKey(item);
}

/** A tombstone is retired only when a fetched server page no longer has it. */
function reconcileRemovedFeedKeys(removed,received){
 const incoming=Array.isArray(received)?received:[];
 const present=new Set(incoming.map(removedFeedKey).filter(Boolean));
 const remaining=new Set([...removed].filter(key=>present.has(key)));
 return {removed:remaining,visible:incoming.filter(item=>!remaining.has(removedFeedKey(item)))};
}
module.exports={removedFeedKey,reconcileRemovedFeedKeys};
