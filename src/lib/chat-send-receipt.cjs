'use strict';
function validId(reply){return Boolean(reply&&Number.isSafeInteger(reply.id)&&reply.id>0&&!reply.deletedAt);}
function equalUser(value,expected){return typeof value==='string'&&typeof expected==='string'&&Boolean(expected.trim())&&value.toLowerCase()===expected.toLowerCase();}
function sameText(actual,requested){return typeof actual==='string'&&typeof requested==='string'&&Boolean(requested.trim())&&actual.trim()===requested.trim();}
function sameReply(reply,id){return (reply.replyToMessageId??null)===(id??null);}
function confirmedDirectChatSend(reply,author,peer,text,replyToId){
 return validId(reply)&&equalUser(reply.username1,author)&&equalUser(reply.username2,peer)&&
 sameText(reply.text,text)&&sameReply(reply,replyToId)&&
 reply.date!=null&&((typeof reply.date==='string'&&Number.isFinite(Date.parse(reply.date)))||
 (typeof reply.date==='number'&&Number.isFinite(reply.date)&&reply.date>0));
}
function confirmedCommunityChatSend(reply,communityId,author,text,replyToId){
 return validId(reply)&&Number.isSafeInteger(communityId)&&reply.communityId===communityId&&
 reply.kind==='CHAT'&&equalUser(reply.username,author)&&sameText(reply.body,text)&&
 sameReply(reply,replyToId)&&typeof reply.createdAt==='string'&&!Number.isNaN(Date.parse(reply.createdAt));
}
module.exports={confirmedDirectChatSend,confirmedCommunityChatSend};
