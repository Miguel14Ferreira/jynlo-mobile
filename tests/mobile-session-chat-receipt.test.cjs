'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {confirmedSessionChatSend:ok}=require('../src/lib/session-chat-receipt.cjs');
const sample={id:52,sessionId:8,senderUsername:'Miguel',body:'Boa tarde',createdAt:'2026-11-13T12:00:00Z',replyToMessageId:null,deletedAt:null,senderGuest:false};
test('only exact server persisted chat response allows clearing the sent draft',()=>{
 assert.equal(ok(sample,8,'miguel',' Boa tarde ',null),true);
 assert.equal(ok({...sample,id:0},8,'miguel','Boa tarde',null),false);
 assert.equal(ok({...sample,sessionId:9},8,'miguel','Boa tarde',null),false);
 assert.equal(ok({...sample,senderUsername:'someone'},8,'miguel','Boa tarde',null),false);
 assert.equal(ok({...sample,body:'different'},8,'miguel','Boa tarde',null),false);
 assert.equal(ok({...sample,createdAt:'invalid'},8,'miguel','Boa tarde',null),false);
 assert.equal(ok({...sample,senderGuest:true},8,'miguel','Boa tarde',null),false);
 assert.equal(ok({...sample,deletedAt:'2026-11-13T12:00:01Z'},8,'miguel','Boa tarde',null),false);
 assert.equal(ok(null,8,'miguel','Boa tarde',null),false);
});
test('reply receipt must match the intended quoted message id',()=>{
 assert.equal(ok({...sample,replyToMessageId:47},8,'miguel','Boa tarde',47),true);
 assert.equal(ok(sample,8,'miguel','Boa tarde',47),false);
 assert.equal(ok({...sample,replyToMessageId:47},8,'miguel','Boa tarde',null),false);
});
