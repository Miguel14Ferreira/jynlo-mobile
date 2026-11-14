'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=relative=>fs.readFileSync(path.join(__dirname,'..',relative),'utf8');

test('every chat composer exposes a meaningful action for screen readers',()=>{
 const direct=read('app/messages/[peer].tsx');
 const community=read('src/components/CommunityChatPanel.tsx');
 const session=read('src/components/SessionChatPanel.tsx');
 assert.ok(direct.includes("accessibilityLabel={sending?'A enviar mensagem…':'Enviar mensagem privada'}"));
 assert.ok(community.includes("accessibilityLabel={sending?'A enviar mensagem…':'Enviar mensagem para a comunidade'}"));
 assert.ok(session.includes("accessibilityLabel={sending?'A enviar mensagem…':'Enviar mensagem'}"));
});
test('shared page scrolls focused text inputs, rather than always jumping past editors',()=>{
 const page=read('src/components/UI.tsx');
 assert.ok(page.includes('scrollResponderScrollNativeHandleToKeyboard(focused,24,true)'));
 assert.ok(page.includes('else if(autoScrollToEnd&&nearBottom.current)'));
 assert.ok(!page.includes('nearBottom.current=true;\n       scrollRef.current?.scrollToEnd'));
});
