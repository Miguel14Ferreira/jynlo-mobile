'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {confirmedSingleChatPhotoReply}=require('../src/lib/chat-attachments-core.cjs');
const mime='image/jpeg';
const common={id:701,attachmentName:'photo.jpg',attachmentMimeType:mime,attachmentSize:42000,deletedAt:null,replyToMessageId:null};
test('photo receipts must belong to the requested community and be chat messages',()=>{
 const valid={...common,communityId:12,kind:'CHAT'};
 assert.equal(confirmedSingleChatPhotoReply(valid,'community',12,mime),true);
 assert.equal(confirmedSingleChatPhotoReply(valid,'community',13,mime),false);
 assert.equal(confirmedSingleChatPhotoReply({...valid,kind:'POST'},'community',12,mime),false);
});
test('photo receipts must belong to the correct session or direct conversation',()=>{
 const session={...common,sessionId:44,senderUsername:'player_one'};
 assert.equal(confirmedSingleChatPhotoReply(session,'session',44,mime),true);
 assert.equal(confirmedSingleChatPhotoReply(session,'session',45,mime),false);
 assert.equal(confirmedSingleChatPhotoReply({...session,senderUsername:''},'session',44,mime),false);
 const direct={...common,username2:'Player_Two'};
 assert.equal(confirmedSingleChatPhotoReply(direct,'direct','player_two',mime),true);
 assert.equal(confirmedSingleChatPhotoReply(direct,'direct','player_three',mime),false);
});
test('invalid, missing or mismatched photo metadata never confirms a sent message',()=>{
 const valid={...common,communityId:9,kind:'CHAT'};
 for(const reply of [
  null,{...valid,id:0},{...valid,id:-1},{...valid,id:'701'},
  {...valid,deletedAt:'2026-01-01T12:00:00Z'},
  {...valid,attachmentName:'  '},{...valid,attachmentMimeType:'image/png'},
  {...valid,attachmentSize:0},{...valid,attachmentSize:6*1024*1024},
  {...valid,replyToMessageId:9}
 ])assert.equal(confirmedSingleChatPhotoReply(reply,'community',9,mime),false,JSON.stringify(reply));
 assert.equal(confirmedSingleChatPhotoReply({...valid,replyToMessageId:9},'community',9,mime,9),true);
 assert.equal(confirmedSingleChatPhotoReply(valid,'community',9,mime,9),false);
 assert.equal(confirmedSingleChatPhotoReply(valid,'unknown',9,mime),false);
});
