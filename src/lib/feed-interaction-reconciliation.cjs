'use strict';

/** Keep authoritative like results visible until a feed GET has caught up.
 * Maps are scoped to one authenticated account by the caller.
 * A short expiry prevents an indefinitely stale override if the backend fails
 * to converge or the post disappears from the feed.
 */
const RECEIPT_TTL_MS=120000;
function validReceipt(value){
 return value&&typeof value==='object'&&typeof value.likedByMe==='boolean'&&
  Number.isSafeInteger(value.likeCount)&&value.likeCount>=0;
}
function rememberPostLike(receipts,postId,receipt,now=Date.now()){
 if(!Number.isSafeInteger(postId)||postId<=0||!validReceipt(receipt))return new Map(receipts);
 const next=new Map(receipts);
 next.set(postId,{likedByMe:receipt.likedByMe,likeCount:receipt.likeCount,until:now+RECEIPT_TTL_MS});
 return next;
}
function reconcilePostLikes(receipts,posts,now=Date.now()){
 const next=new Map();
 const byId=new Map();
 for(const post of posts||[]){
  if(post?.type==='POST'&&Number.isSafeInteger(post.postId))byId.set(post.postId,post);
 }
 for(const [postId,entry] of receipts){
  if(!validReceipt(entry)||!Number.isFinite(entry.until)||entry.until<=now)continue;
  const authoritative=byId.get(postId);
  // A matching viewer like-state proves the backend caught up. Do not
  // freeze the count if other users have added or removed likes meanwhile.
  if(authoritative&&authoritative.likedByMe===entry.likedByMe)continue;
  next.set(postId,entry);
 }
 return {
  receipts:next,
  posts:(posts||[]).map(post=>{
   const receipt=post?.type==='POST'?next.get(post.postId):null;
   return receipt?{...post,likedByMe:receipt.likedByMe,likeCount:receipt.likeCount}:post;
  })
 };
}
/** After a successful comment POST, protect the smallest confirmed count.
 * Unlike a like receipt, comment POSTs do not return the aggregate count.
 * Accept any later GET at or above the floor so other users' comments remain visible.
 */
function rememberCommentFloor(floors,postId,count,now=Date.now()){
 const next=new Map(floors);
 if(!Number.isSafeInteger(postId)||postId<=0||
    !Number.isSafeInteger(count)||count<0)return next;
 const before=next.get(postId);
 next.set(postId,{count:Math.max(count,before?.count??0),until:now+RECEIPT_TTL_MS});
 return next;
}
function reconcileCommentCounts(floors,posts,now=Date.now()){
 const next=new Map();
 const byId=new Map();
 for(const post of posts||[]){
  if(post?.type==='POST'&&Number.isSafeInteger(post.postId))byId.set(post.postId,post);
 }
 for(const [id,entry] of floors){
  if(!Number.isSafeInteger(entry?.count)||entry.count<0||
     !Number.isFinite(entry.until)||entry.until<=now)continue;
  const fromServer=byId.get(id);
  if(fromServer&&Number.isSafeInteger(fromServer.commentCount)&&fromServer.commentCount>=entry.count)continue;
  next.set(id,entry);
 }
 return {
  floors:next,
  posts:(posts||[]).map(post=>{
   const floor=post?.type==='POST'?next.get(post.postId):null;
   return floor?{...post,commentCount:Math.max(post.commentCount||0,floor.count)}:post;
  })
 };
}
module.exports={RECEIPT_TTL_MS,rememberPostLike,reconcilePostLikes,rememberCommentFloor,reconcileCommentCounts};
