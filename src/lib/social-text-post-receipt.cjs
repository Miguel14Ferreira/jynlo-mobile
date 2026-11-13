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
module.exports={confirmedTextPostReceipt};
