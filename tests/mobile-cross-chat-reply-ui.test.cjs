'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

test('one accessible reply preview is shared by all three chat surfaces',()=>{
 const component=read('src/components/ChatReplyPreview.tsx');
 assert.match(component,/accessibilityLabel="Cancelar resposta à mensagem"/);
 assert.match(component,/numberOfLines=\{2\}/);
 assert.match(component,/disabled=\{disabled\} onPress=\{onCancel\}/);
 assert.match(component,/borderLeftWidth:3,borderLeftColor:C\.mint/);
 const team=read('src/components/SportsTeamContentPanel.tsx');
 const community=read('src/components/CommunityChatPanel.tsx');
 const session=read('src/components/SessionChatPanel.tsx');
 for(const view of [team,community,session]){
  assert.match(view,/import ChatReplyPreview from '\.\/ChatReplyPreview'/);
  assert.match(view,/<ChatReplyPreview sender=/);
  assert.match(view,/onCancel=\{\(\)=>/);
  assert.match(view,/disabled=\{sending\|\|uploading\}/);
 }
});
test('team chat composer is compact and feed publishing remains a separate action',()=>{
 const team=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(team,/kind==='chat'\?styles\.chatComposerRow:styles\.feedComposerColumn/);
 assert.match(team,/chatComposerRow:\{flexDirection:'row',alignItems:'flex-end',gap:8\}/);
 assert.match(team,/chatSendButton:\{width:48,minWidth:48,minHeight:48/);
 assert.match(team,/kind==='feed'\?<Text style=\{styles\.buttonText\}>/);
 assert.match(team,/enabled=\{!sending&&!uploading\} compact replyId=\{replyTo\}/);
 assert.match(team,/onPress=\{\(\)=>void send\(\)\}/);
});
test('session messages show structured quotes and use readable history dimensions',()=>{
 const session=read('src/components/SessionChatPanel.tsx');
 const community=read('src/components/CommunityChatPanel.tsx');
 assert.match(session,/\{m\.replyToText\?<View style=\{styles\.quote\}>/);
 assert.match(session,/quoteAuthor:\{fontSize:12,color:C\.mint/);
 assert.match(session,/quoteBody:\{fontSize:12,lineHeight:18/);
 for(const view of [session,community]){
  assert.match(view,/inlineHistory:\{height:470,maxHeight:470,minHeight:240/);
  assert.match(view,/inlineHistoryKeyboard:\{height:230,maxHeight:230,minHeight:120/);
 }
 assert.match(session,/<ChatPdfComposer compact target=/);
 assert.match(session,/if\(firstHistoryPositionPending\.current(?:\|\|initialAutoScrollPending\.current)?\)return/);
});
