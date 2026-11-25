const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>untranslate(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));

test('ordinary page scrolling does not enable chat auto-follow by default',()=>{
 const ui=read('src/components/UI.tsx');
 assert.match(ui,/autoScrollToEnd=false/);
 assert.match(ui,/autoScrollToEnd&&nearBottom\.current/);
 assert.match(ui,/KeyboardAwareScrollView/);
});

for(const [name,route,component] of [
 ['community','app/communities/[id]/chat.tsx','src/components/CommunityChatPanel.tsx'],
 ['session','app/sessions/[id]/chat.tsx','src/components/SessionChatPanel.tsx']
]){
 test(name+' chat uses a measured, independent history viewport',()=>{
  const screen=read(route),panel=read(component);
  assert.match(screen,new RegExp(name==='community'?'CommunityChatPanel':'SessionChatPanel'));
  assert.match(panel,/const inlineNearBottom=useRef\(false\)/);
  assert.match(panel,/const inlineHistoryRef=useRef<ScrollViewInstance\|null>\(null\)/);
  assert.match(panel,/inlineNearBottom\.current=contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-90/);
  assert.match(panel,/composerFocused\.current&&inlineNearBottom\.current/);
 });
}

test('private chat only auto-follows after measuring a near-bottom viewport',()=>{
 const screen=read('app/messages/[peer].tsx');
 assert.match(screen,/const nearBottom=useRef\(false\)/);
 assert.match(screen,/const historyViewportMeasured=useRef\(false\)/);
 assert.match(screen,/historyViewportMeasured\.current=currentMeasurement/);
 assert.match(screen,/nearBottom\.current=contentOffset\.y\+layoutMeasurement\.height>=historyContentHeight\.current-90/);
 assert.match(screen,/if\(!currentMeasurement\)\{/);
 assert.match(screen,/nearBottom\.current&&historyViewportMeasured\.current/);
});
