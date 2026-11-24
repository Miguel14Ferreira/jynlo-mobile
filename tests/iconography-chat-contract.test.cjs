const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>untranslate(fs.readFileSync(path.join(root,p),'utf8'));

test('direct, session and community chats render vector attachments and remove actions',()=>{
 for(const screen of ['app/messages/[peer].tsx','src/components/SessionChatPanel.tsx','src/components/CommunityChatPanel.tsx']){
  const source=read(screen);
  assert.match(source,/import \{JynloIcon\}/,screen);
  assert.match(source,/name=\{attachmentsOpen\?'close':'(?:attachment|plus)'\}/,screen);
  assert.match(source,/name="remove"/,screen);
  assert.doesNotMatch(source,/＋ Anexar ficheiro|✕ Remover/,screen);
 }
});
test('all three chats have a vector map affordance, not platform-specific Unicode arrows',()=>{
 for(const screen of ['app/messages/[peer].tsx','src/components/SessionChatPanel.tsx','src/components/CommunityChatPanel.tsx']){
  const source=read(screen);
  assert.match(source,/name="location"/,screen);
  assert.doesNotMatch(source,/⌖ Abrir localização|Abrir localização no mapa ↗/,screen);
 }
});
test('the shared icon registry declares chat actions',()=>{
 const source=read('src/components/JynloIcon.tsx');
 for(const name of ['attachment','remove','reply','edit','microphone','video'])
  assert.match(source,new RegExp('\\b'+name+':\\{regular:'),name);
});
