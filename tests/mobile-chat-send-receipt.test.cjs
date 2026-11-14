'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {confirmedDirectChatSend:direct,confirmedCommunityChatSend:community}=require('../src/lib/chat-send-receipt.cjs');
const d={id:9,username1:'Alice',username2:'Bob',text:'Olá!',date:'2026-11-13T12:10:00Z',replyToMessageId:null,deletedAt:null};
const c={id:10,communityId:28,kind:'CHAT',username:'Alice',body:'Vamos jogar?',createdAt:'2026-11-13T12:10:00Z',replyToMessageId:null};
test('direct message is only confirmed for correct author, recipient, body and reply',()=>{
 assert.equal(direct(d,'alice','bob',' Olá! ',null),true);
 for(const bad of [{id:0},{username1:'Bob'},{username2:'Charlie'},{text:'Outra'},{date:'invalid'},{deletedAt:'now'},{replyToMessageId:44}]){
  assert.equal(direct({...d,...bad},'alice','bob','Olá!',null),false,JSON.stringify(bad));
 }
 assert.equal(direct({...d,replyToMessageId:44},'Alice','Bob','Olá!',44),true);
 assert.equal(direct(d,'Alice','Bob','Olá!',44),false);
 assert.equal(direct({...d,date:1794571800000},'Alice','Bob','Olá!',null),true);
 assert.equal(direct({...d,date:0},'Alice','Bob','Olá!',null),false);
 assert.equal(direct(null,'Alice','Bob','Olá!',null),false);
});
test('community receipt belongs to exact community, text, author and reply',()=>{
 assert.equal(community(c,28,'alice','Vamos jogar?',null),true);
 for(const bad of [{id:0},{communityId:29},{kind:'POST'},{username:'Bob'},{body:'Outro texto'},{createdAt:'invalid'},{deletedAt:'now'},{replyToMessageId:9}]){
  assert.equal(community({...c,...bad},28,'Alice','Vamos jogar?',null),false,JSON.stringify(bad));
 }
 assert.equal(community({...c,replyToMessageId:9},28,'Alice','Vamos jogar?',9),true);
});
test('UI protects drafts from unverified HTTP responses',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const root=path.join(__dirname,'..');
 const directSource=fs.readFileSync(path.join(root,'app/messages/[peer].tsx'),'utf8');
 const communitySource=fs.readFileSync(path.join(root,'src/components/CommunityChatPanel.tsx'),'utf8');
 assert.match(directSource,/confirmedDirectChatSend\(confirmed,auth\.username\|\|'',peer,submittedText,originalReply\?\.id\)/);
 assert.match(communitySource,/confirmedCommunityChatSend\(confirmed,id,username,message,originalReplyId\)/);
 for(const screen of [directSource,communitySource])assert.match(screen,/O servidor respondeu, mas não confirmou/);
});
