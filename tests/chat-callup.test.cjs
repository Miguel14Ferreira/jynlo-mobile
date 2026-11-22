const untranslate=require('./untranslate.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {encodeCallUp,readCallUp,isCallUpText}=require('../src/lib/chat-callup.cjs');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('convocatória envelope matches the server and web format',()=>{
 assert.equal(encodeCallUp(42),'[JYNLO:SESSION:1]42');
 assert.equal(readCallUp('[JYNLO:SESSION:1]42'),42);
 for(const bad of ['[JYNLO:SESSION:1]','[JYNLO:SESSION:1]0','[JYNLO:SESSION:1]x','[JYNLO:SESSION:1]4 2','olá',null])
  assert.equal(readCallUp(bad),null);
 assert.equal(encodeCallUp(0),'');
 assert.equal(isCallUpText('[JYNLO:SESSION:1]x'),true);
});
test('both chats render the call-up card and offer the picker',()=>{
 for(const file of ['app/messages/[peer].tsx','src/components/CommunityChatPanel.tsx']){
  const source=read(file);
  assert.match(source,/<CallUpCard /,file+' renders the card');
  assert.match(source,/<CallUpPicker /,file+' offers the picker');
  assert.match(source,/encodeCallUp\(/,file+' sends the envelope');
 }
});
test('the card joins through the normal session endpoint',()=>{
 const card=read('src/components/CallUpCard.tsx');
 assert.match(card,/joinSession\(/);
 assert.match(card,/sessionDetail\(/);
});
