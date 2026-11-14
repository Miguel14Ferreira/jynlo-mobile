'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const screens=['src/components/SessionChatPanel.tsx','src/components/CommunityChatPanel.tsx'];

test('both embedded chats follow the keyboard only while typing',()=>{
 for(const file of screens){
  const s=read(file);
  assert.match(s,/useRef<ScrollView\|null>\(null\)/,file);
  assert.match(s,/Keyboard\.addListener\(event/,file);
  assert.match(s,/if\(composerFocused\.current\)inlineHistoryRef\.current\?\.scrollToEnd/,file);
  assert.match(s,/return\(\)=>subscription\.remove\(\)/,file);
  assert.match(s,/<ScrollView ref=\{inlineHistoryRef\}/,file);
  assert.match(s,/onFocus=\{\(\)=>\{composerFocused\.current=true/,file);
  assert.match(s,/onBlur=\{\(\)=>\{composerFocused\.current=false/,file);
  assert.match(s,/if\(!embedded\)return;/,file);
 }
});
test('embedded chat messages use shared vectors rather than glyph placeholders',()=>{
 for(const file of screens){
  const s=read(file);
  for(const name of ['reply','more','video','remove','location'])
    assert.ok(s.includes('name="'+name+'"'),file+': '+name);
  assert.doesNotMatch(s,/>▶ Vídeo<|>↩<|>•••</,file);
 }
});
