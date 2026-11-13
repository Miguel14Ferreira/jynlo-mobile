'use strict';
function sameUser(actual,expected){return typeof actual==='string'&&typeof expected==='string'&&expected.trim().length>0&&actual.toLowerCase()===expected.toLowerCase();}
function confirmedTextPostReceipt(reply,username,content,location){
 return Boolean(reply&&typeof reply==='object'&&reply.type==='POST'&&
  Number.isSafeInteger(reply.postId)&&reply.postId>0&&
  sameUser(reply.authorUsername,username)&&
  typeof reply.content==='string'&&reply.content.trim()===content.trim()&&
  (typeof reply.location==='string'?reply.location.trim():'')===location.trim()&&
  typeof reply.createdAt==='string'&&Number.isFinite(Date.parse(reply.createdAt)));
}
function confirmedStoryAuthorReceipt(reply,username,caption){
 return Boolean(reply&&typeof reply==='object'&&
  Number.isSafeInteger(reply.id)&&reply.id>0&&
  sameUser(reply.authorUsername,username)&&
  (typeof reply.caption==='string'?reply.caption.trim():'')===caption.trim()&&
  typeof reply.createdAt==='string'&&Number.isFinite(Date.parse(reply.createdAt)));
}
module.exports={confirmedTextPostReceipt,confirmedStoryAuthorReceipt};
