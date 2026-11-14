'use strict';

/** Reject malformed acknowledgements; a successful HTTP status alone does not
 * establish whether the post was liked or what count is safe to render. */
function verifiedPostLikeReceipt(receipt){
 if(!receipt||typeof receipt!=='object'||
    typeof receipt.likedByMe!=='boolean'||
    !Number.isSafeInteger(receipt.likeCount)||receipt.likeCount<0)return null;
 return {likedByMe:receipt.likedByMe,likeCount:receipt.likeCount};
}
module.exports={verifiedPostLikeReceipt};
