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
module.exports={RECEIPT_TTL_MS,rememberPostLike,reconcilePostLikes};
