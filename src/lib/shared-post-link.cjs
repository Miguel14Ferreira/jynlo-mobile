'use strict';
const DOMAIN='https://jynlosports.com';
function sharedPostLink(post){
 if(!post||typeof post!=='object')return DOMAIN;
 const id=post.type==='POST'?post.postId:post.sessionId;
 if(!Number.isSafeInteger(id)||id<=0)return DOMAIN;
 return DOMAIN+(post.type==='POST'?'/posts/':'/sessions/')+id;
}
module.exports={sharedPostLink};
