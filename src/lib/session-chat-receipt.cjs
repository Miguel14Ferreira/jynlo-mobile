'use strict';
/** Require a server-confirmed message for the right chat, author and reply.
 * A successful HTTP status alone does not prove that a message was persisted.
 */
function confirmedSessionChatSend(reply,sessionId,username,text,replyId){
 if(!reply||typeof reply!=='object'||!Number.isSafeInteger(reply.id)||reply.id<=0)return false;
 if(!Number.isSafeInteger(sessionId)||reply.sessionId!==sessionId)return false;
 if(typeof username!=='string'||!username.trim()||typeof reply.senderUsername!=='string'||
    reply.senderUsername.toLowerCase()!==username.trim().toLowerCase()||reply.senderGuest===true)return false;
 if(typeof text!=='string'||!text.trim()||typeof reply.body!=='string'||reply.body.trim()!==text.trim())return false;
 if((reply.replyToMessageId??null)!==(replyId??null)||reply.deletedAt)return false;
 return typeof reply.createdAt==='string'&&Number.isFinite(Date.parse(reply.createdAt));
}
module.exports={confirmedSessionChatSend};
