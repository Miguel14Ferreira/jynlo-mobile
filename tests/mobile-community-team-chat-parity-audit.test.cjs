'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('community message events recheck membership through HTTP before showing messages',()=>{
 const component=read('src/components/CommunityChatPanel.tsx');
 const start=component.indexOf('onMessage:(_msg)=>');
 const end=component.indexOf('// Real-time events normally update',start);
 assert.ok(start>0&&end>start);
 const handler=component.slice(start,end);
 assert.match(handler,/if\(!active\|\|version!==generation\.current\|\|revokedRef\.current\)return/);
 assert.match(handler,/AppState\.currentState==='active'&&!sendingNow\.current/);
 assert.match(handler,/void refresh\(version,true\)/);
 assert.doesNotMatch(handler,/setMessages\(/);
 assert.match(component,/communityMessages\(id,auth\.token,auth\.username\)/);
 assert.match(component,/\[401,403,404,410\]\.includes\(e\.status\)/);
 assert.match(component,/revokedRef\.current=true;setAccessRevoked\(true\);setMessages\(\[\]\)/);
});

test('team chat keeps input accessible without jumping away from earlier messages',()=>{
 const component=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(component,/const composerFocused=useRef\(false\)/);
 assert.match(component,/Keyboard\.addListener\(Platform\.OS==='ios'\?'keyboardWillShow':'keyboardDidShow'/);
 assert.match(component,/if\(kind==='chat'&&composerFocused\.current&&nearLatest\.current\)/);
 assert.match(component,/historyRef\.current\?\.scrollToEnd\(\{animated:true\}\)/);
 assert.match(component,/onFocus=\{\(\)=>\{composerFocused\.current=true;\}\} onBlur=\{\(\)=>\{composerFocused\.current=false;\}\}/);
 assert.match(component,/keyboardOpen&&styles\.chatHistoryKeyboard/);
 assert.match(component,/return\(\)=>\{open\.remove\(\);close\.remove\(\);\}/);
 assert.match(component,/\},\[kind\]\)/);
});

test('team feed and team chat keep permissions, private media, WebSocket and fallback',()=>{
 const component=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(component,/observeTeamContent\(\{teamId,kind,token/);
 assert.match(component,/if\(!socketOnline\|\|pollTicks%6===0\)void refresh\(true,current,true\)/);
 assert.match(component,/teamPrivateAttachmentsAvailable\(teamId,kind,token\)/);
 assert.match(component,/onAuthorizationError=\{status=>\{revokeIfUnauthorized/);
 assert.match(component,/ChatPdfComposer target=\{\{scope:'team',id:teamId,kind\}\}/);
 assert.doesNotMatch(component,/title="Atualizar"/);
});

test('team messages use direct-chat bubbles while team feed keeps full-width cards',()=>{
 const component=read('src/components/SportsTeamContentPanel.tsx');
 assert.match(component,/kind==='chat'&&styles\.chatBubble/);
 assert.match(component,/kind==='chat'&&item\.username\?\.toLowerCase\(\)===username\.toLowerCase\(\)&&styles\.ownChatBubble/);
 assert.match(component,/kind==='feed'&&item\.replyToId!=null/);
 assert.match(component,/chatBubble:\{maxWidth:'89%',alignSelf:'flex-start'/);
 assert.match(component,/ownChatBubble:\{alignSelf:'flex-end'/);
 assert.match(component,/entry:\{borderWidth:1/);
 assert.match(component,/historyContent:\{gap:11,paddingBottom:12,paddingHorizontal:5\}/);
});
