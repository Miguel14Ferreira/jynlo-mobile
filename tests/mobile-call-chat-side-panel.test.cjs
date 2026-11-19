'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

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
 assert.match(panel,/confirmedDirectChatSend\(confirmed,self,peer,body\)/);
 assert.match(panel,/observeDirectChat\(\{peer,self,token,onInvalidated:/);
 assert.match(panel,/setInterval\(\(\)=>\{/);
 assert.match(panel,/setMessages\(current=>current\.some\(m=>m\.id===confirmed\.id\)/);
 assert.match(panel,/void load\(version,true\)/);
 assert.doesNotMatch(panel,/await load\(version,true\)/);
 assert.match(panel,/onContentSizeChange=\{\(\)=>list\.current\?\.scrollToEnd/);
 assert.match(panel,/O servidor não confirmou a mensagem/);
});
test('call chat revokes old account messages and never fabricates call-only history',()=>{
 const panel=read('src/components/CallChatSidePanel.tsx');
 assert.match(panel,/const identity=peer\+'\|'\+self\+'\|'\+token/);
 assert.match(panel,/generation\.current!==version\|\|owner\.current!==identity/);
 assert.match(panel,/\[401,403,404,410\]\.includes\(e\.status\)/);
 assert.match(panel,/setMessages\(\[\]\);setDraft\(''\);setAccessRevoked\(true\)/);
 assert.match(panel,/if\(!visible\|\|accessRevoked\|\|sendLock\.current/);
 assert.match(panel,/const rows=await directChatHistory/);
 assert.doesNotMatch(panel,/markDirectRead\(/);
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
