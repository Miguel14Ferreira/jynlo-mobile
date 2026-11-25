const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
const screens=['src/components/SessionChatPanel.tsx','src/components/CommunityChatPanel.tsx'];

test('both embedded chats follow the keyboard only while typing',()=>{
 for(const file of screens){
  const s=read(file);
  assert.match(s,/useRef<ScrollViewInstance\|null>\(null\)/,file);
  assert.match(s,/Keyboard\.addListener\(showEvent/,file);
  assert.match(s,/Keyboard\.addListener\(hideEvent/,file);
  assert.match(s,/setKeyboardVisible\(true\)/,file);
  assert.match(s,/setKeyboardVisible\(false\)/,file);
  assert.match(s,/composerFocused\.current&&inlineNearBottom\.current\)inlineHistoryRef\.current\?\.scrollToEnd/,file);
  assert.match(s,/shown\.remove\(\);hidden\.remove\(\)/,file);
  // Shorter history while typing (exact size changed in the redesign).
  assert.match(s,/inlineHistoryKeyboard:\{height:(\d+)[,}]/,file);
  const [,full]=s.match(/inlineHistory:\{height:(\d+)/);const [,typing]=s.match(/inlineHistoryKeyboard:\{height:(\d+)/);
  assert.ok(Number(typing)<Number(full),file+' keyboard history must be shorter');
  assert.match(s,/keyboardVisible&&styles\.inlineHistoryKeyboard/,file);
  assert.match(s,/<ScrollView ref=\{inlineHistoryRef\}/,file);
  assert.match(s,/onFocus=\{\(\)=>\{composerFocused\.current=true/,file);
  assert.match(s,/onBlur=\{\(\)=>\{composerFocused\.current=false/,file);
  assert.match(s,/embedded=false/,file);
 }
});
test('embedded chat messages use shared vectors rather than glyph placeholders',()=>{
 for(const file of screens){
  const s=read(file);
  for(const name of ['reply','more','video','remove','location'])
    assert.ok(s.includes('name="'+name+'"')||((name==='reply'||name==='more')&&s.includes('ChatMessageMenu')),file+': '+name);
  assert.doesNotMatch(s,/>▶ Vídeo<|>↩<|>•••</,file);
 }
});
