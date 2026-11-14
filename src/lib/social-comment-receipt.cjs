'use strict';
const validId=n=>Number.isSafeInteger(n)&&n>0;

/** Check that a comment mutation was persisted for exactly the requested
 * post/comment and author. A 2xx response alone is not an acknowledgement. */
function verifiedCommentReceipt(result,{postId,commentId=null,username=null,content=null,likedByMe=null}={}){
 if(!result||typeof result!=='object'||!validId(result.id)||!validId(result.postId)||
    result.postId!==postId||(commentId!==null&&result.id!==commentId)||
    typeof result.content!=='string')return null;
 if(username!==null&&(!username||
   typeof result.authorUsername!=='string'||result.authorUsername.toLowerCase()!==username.toLowerCase()))return null;
 if(content!==null&&result.content.trim()!==content.trim())return null;
 if(likedByMe!==null&&(typeof result.likedByMe!=='boolean'||result.likedByMe!==likedByMe))return null;
 if(likedByMe!==null&&(!Number.isSafeInteger(result.likeCount)||result.likeCount<0))return null;
 return result;
}
module.exports={verifiedCommentReceipt};
