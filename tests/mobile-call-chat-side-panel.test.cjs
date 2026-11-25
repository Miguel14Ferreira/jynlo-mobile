const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('in-call chat stays inside the mounted LiveKit room and alongside participants',()=>{
 const call=read('src/features/direct-call-screen.tsx');
 assert.match(call,/import CallChatSidePanel from '\.\.\/components\/CallChatSidePanel'/);
 assert.match(call,/const \[expandedVideo,setExpandedVideo\]=useState\(false\),\[showChat,setShowChat\]=useState\(false\)/);
 assert.match(call,/const wide=width>=720/);
 assert.match(call,/videoStageDimensions\(wide&&showChat\?width-345:width,height,expandedVideo\)/);
 assert.match(call,/accessibilityLabel="Participantes da chamada"/);
 assert.match(call,/accessibilityLabel=\{showChat\?'Ocultar chat da chamada':'Abrir chat da chamada'\}/);
 assert.match(call,/<CallChatSidePanel peer=\{peer\} self=\{self\} token=\{token\} visible=\{showChat\} wide=\{wide\}\/>/);
 assert.match(call,/callColumnsWide:\{flexDirection:'row'/);
 assert.match(call,/<MediaControls media=\{session\.media\} peer=\{peer\} self=\{auth\.username\|\|''\} token=\{auth\.token\}/);
 assert.match(call,/const \[muted,setMuted\]=useState\(false\)/);
 const position=call.indexOf('const dimensions=videoStageDimensions');
 const state=call.indexOf('const [expandedVideo,setExpandedVideo]');
 assert.ok(state>=0&&position>state,'video size must not reference expandedVideo before state initializes');
});
test('in-call chat uses real authenticated direct messages and realtime invalidations',()=>{
 const panel=read('src/components/CallChatSidePanel.tsx');
 assert.match(panel,/directChatHistory\(peer,token\)/);
 assert.match(panel,/sendDirectChat\(peer,body,token\)/);
 assert.match(panel,/confirmedDirectChatSend\(confirmed,self,peer,body(,null)?\)/);
 assert.match(panel,/observeDirectChat\(\{peer,self,token,onInvalidated:/);
 assert.match(panel,/setInterval\(\(\)=>\{/);
 assert.match(panel,/setMessages\(current=>current\.some\(m=>m\.id===confirmed\.id\)/);
 assert.match(panel,/void load\(version,true\)/);
 assert.doesNotMatch(panel,/await load\(version,true\)/);
 assert.match(panel,/onContentSizeChange=\{\(\)=>\{/);
 assert.match(panel,/O servidor não confirmou a mensagem/);
});
test('call chat revokes old account messages and never fabricates call-only history',()=>{
 const panel=read('src/components/CallChatSidePanel.tsx');
 assert.match(panel,/const identity=peer\+'\|'\+self\+'\|'\+token/);
 assert.match(panel,/generation\.current!==version\|\|owner\.current!==identity/);
 assert.match(panel,/\[401,403,404,410\]\.includes\(e\.status\)/);
 assert.match(panel,/setMessages\(\[\]\);setDraft\(''\);recentlyConfirmed\.current\.clear\(\);setAccessRevoked\(true\)/);
 assert.match(panel,/if\(!visible\|\|owner\.current!==identity\|\|accessRevoked\|\|sendLock\.current/);
 assert.match(panel,/const rows=await directChatHistory/);
 assert.doesNotMatch(panel,/markDirectRead\(/);
});


test('closing and reopening the call chat never releases an unconfirmed server POST',()=>{
 const panel=read('src/components/CallChatSidePanel.tsx');
 assert.ok(panel.includes('const pendingSend=useRef<{identity:string;request:number}|null>(null)'));
 assert.ok(panel.includes('sendLock.current=pendingSend.current?.identity===identity'));
 assert.ok(panel.includes('pendingSend.current={identity,request}'));
 assert.ok(panel.includes('if(pendingSend.current?.request===request)pendingSend.current=null'));
 assert.ok(panel.includes('if(owner.current!==actor)return'));
 assert.ok(panel.includes("setDraft(current=>current.trim()===body?'':current)"));
});
test('uncertain in-call messages cannot be duplicated before explicit history confirmation',()=>{
 const panel=read('src/components/CallChatSidePanel.tsx');
 assert.ok(panel.includes("import {uncertainChatSend} from '../lib/chat-send-uncertainty.cjs'"));
 assert.ok(panel.includes('uncertainSendRef.current?.identity===identity&&uncertainSendRef.current.body===body)return'));
 assert.ok(panel.includes('if(uncertainChatSend(e))'));
 assert.ok(panel.includes('uncertainSendRef.current=uncertain;setUncertainSend(uncertain)'));
 assert.ok(panel.includes('Este envio não foi confirmado'));
 assert.ok(panel.includes('Já confirmei no histórico · Permitir novo envio'));
 assert.ok(panel.includes('uncertainSend?.identity===identity&&uncertainSend.body===draft.trim()'));
});

test('the call chat respects server deletions while retaining recent acknowledged sends',()=>{
 const panel=read('src/components/CallChatSidePanel.tsx');
 assert.match(panel,/const recentlyConfirmed=useRef\(new Map<number,\{message:DirectChatEntry;at:number\}>\(\)\)/);
 assert.match(panel,/const serverIds=new Set<number>\(\)/);
 assert.match(panel,/if\(serverIds\.has\(id\)\|\|now-entry\.at>45_000\)/);
 assert.match(panel,/recentlyConfirmed\.current\.set\(confirmed\.id,\{message:confirmed,at:Date\.now\(\)\}\)/);
 assert.match(panel,/recentlyConfirmed\.current\.clear\(\);setAccessRevoked\(true\)/);
 assert.match(panel,/readOwner\.current!==identity\+'\|'\+version/);
 assert.doesNotMatch(panel,/for\(const row of \[\.\.\.current,\.\.\.rows\]\)/);
});

test('phone calls prioritize readable chat without leaving the LiveKit room',()=>{
 const call=read('src/features/direct-call-screen.tsx');
 const panel=read('src/components/CallChatSidePanel.tsx');
 assert.match(call,/const compactChatVideo=!wide&&showChat/);
 assert.match(call,/Math\.min\(dimensions\.stageHeight,Math\.max\(150,Math\.round\(height\*\.27\)\)\)/);
 assert.match(call,/height:stageHeight/);
 assert.match(call,/compactChatVideo&&styles\.callColumnsChatOpen/);
 assert.match(call,/compactChatVideo\?Math\.min\(dimensions\.previewWidth,96\)/);
 // On a phone the chat fills the screen below the call (the call page does not scroll).
 assert.match(panel,/narrow:\{flex:1,minHeight:240\}/);
 assert.match(panel,/Na chamada/);
 assert.match(panel,/style=\{styles\.history\}/);
});

test('in-call chat keeps the reader in place and signals new messages without forced scrolling',()=>{
 const panel=read('src/components/CallChatSidePanel.tsx');
 assert.ok(panel.includes('const nearBottom=useRef(true),firstHistoryPositionPending=useRef(true)'));
 assert.ok(panel.includes('const [unseenBelow,setUnseenBelow]=useState(false)'));
 assert.ok(panel.includes('latest>previousLatestMessageId.current'));
 assert.ok(panel.includes('!nearBottom.current&&!firstHistoryPositionPending.current'));
 assert.ok(panel.includes('onScroll={event=>{'));
 assert.ok(panel.includes('if(firstHistoryPositionPending.current)return;'));
 assert.ok(panel.includes('nearBottom.current=contentOffset.y+layoutMeasurement.height>=contentSize.height-90'));
 assert.ok(panel.includes('if(nearBottom.current)setUnseenBelow(false)'));
 assert.ok(panel.includes('}else if(nearBottom.current){'));
 assert.ok(panel.includes('accessibilityLabel="Ir para as mensagens novas da chamada"'));
 assert.ok(panel.includes('Novas mensagens · Ver mais recentes'));
 assert.ok(panel.includes('list.current?.scrollToEnd({animated:true})'));
 assert.ok(panel.includes('previousLatestMessageId.current=0;setUnseenBelow(false)'));
 assert.ok(!panel.includes('onContentSizeChange={()=>list.current?.scrollToEnd'));
});

test('in-call private history and composer are isolated before account-switch effects run',()=>{
 const panel=read('src/components/CallChatSidePanel.tsx');
 assert.ok(panel.includes('const sameConversation=owner.current===identity'));
 assert.ok(panel.includes('const visibleMessages=sameConversation?messages:[]'));
 assert.ok(panel.includes("const visibleDraft=sameConversation?draft:''"));
 assert.ok(panel.includes("const visibleError=sameConversation?error:''"));
 assert.ok(panel.includes("const visibleSyncWarning=sameConversation?syncWarning:''"));
 assert.ok(panel.includes('visibleMessages.map(message=>'));
 assert.ok(panel.includes('!loading&&visibleMessages.length===0'));
 assert.ok(panel.includes('if(!visible||owner.current!==identity||accessRevoked'));
 assert.ok(panel.includes('value={visibleDraft}'));
 assert.ok(panel.includes('editable={sameConversation&&!sending&&!accessRevoked}'));
 assert.ok(panel.includes('disabled={!sameConversation||sending||accessRevoked'));
 assert.ok(panel.includes('sameConversation&&unseenBelow?'));
 assert.ok(panel.includes('sameConversation&&uncertainSend?.identity===identity'));
 assert.ok(!panel.includes('{messages.map(message=>'));
});
