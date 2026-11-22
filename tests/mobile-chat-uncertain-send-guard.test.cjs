const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
const {uncertainChatSend}=require('../src/lib/chat-send-uncertainty.cjs');

test('an unconfirmed message stays blocked, while a definitive authorization rejection does not',()=>{
 for(const value of [new Error('Network request failed'),new Error('O servidor respondeu, mas não confirmou esta mensagem.'),{status:408},{status:499},{status:500},{status:503}])
  assert.equal(uncertainChatSend(value),true);
 for(const status of [400,401,403,404,409,410,422,429])
  assert.equal(uncertainChatSend({status}),false);
});

const chats=[
 {path:'app/messages/[peer].tsx',reply:'replyTarget?.id??null',send:'sendDirectChat'},
 {path:'src/components/CommunityChatPanel.tsx',reply:'reply?.id??null',send:'sendCommunityMessage'},
 {path:'src/components/SessionChatPanel.tsx',reply:'reply?.id??null',send:'postSessionChat'}
];

for(const chat of chats)test(chat.path+' blocks a repeated unconfirmed write until the author checks history',()=>{
 const s=source(chat.path);
 const send=s.slice(s.indexOf('async function send(){'),s.indexOf('async function send(){')+2600);
 assert.match(s,/import \{uncertainChatSend\} from/);
 assert.match(s,/const \[uncertainSend,setUncertainSend\]=useState<\{identity:string;body:string;replyId:number\|null\}\|null>\(null\)/);
 assert.match(s,/const uncertainSendRef=useRef<\{identity:string;body:string;replyId:number\|null\}\|null>\(null\)/);
 assert.match(send,/if\(uncertainSendRef\.current\?\.identity===identity&&uncertainSendRef\.current\.body===draft\.trim\(\)&&uncertainSendRef\.current\.replyId===/);
 assert.match(send,/uncertainSendRef\.current=null;setUncertainSend\(null\)/);
 assert.match(send,/uncertainChatSend\(e\)/);
 assert.match(send,/uncertainSendRef\.current=uncertain;setUncertainSend\(uncertain\)/);
 assert.ok(send.includes(chat.send+'('),chat.send);
 assert.match(s,/title="Já confirmei no histórico · Permitir novo envio"/);
 assert.match(s,/onPress=\{\(\)=>\{uncertainSendRef\.current=null;setUncertainSend\(null\);\}\}/);
 assert.match(s,/uncertainSend\.replyId===/);
 assert.match(s,/Envio sem confirmação\. Confirma no histórico antes de repetir esta mensagem\./);
 assert.match(s,/disabled=\{[^\n]*uncertainSend\?\.identity===/);
 assert.match(send,/if\(uncertainSendRef\.current\?\.identity===identity&&uncertainSendRef\.current\.body===/);
 assert.match(send,/uncertainSendRef\.current\.replyId===/);
 assert.doesNotMatch(send,/\n   uncertainSendRef\.current=null;setUncertainSend\(null\);\n   \/\/ /);

});

test('identity changes clear old pending retry state without clearing it on ordinary refocus',()=>{
 const session=source('src/components/SessionChatPanel.tsx');
 const community=source('src/components/CommunityChatPanel.tsx');
 const direct=source('app/messages/[peer].tsx');
 assert.match(session,/if\(changedAccountOrSession\)\{\s*uncertainSendRef\.current=null;setUncertainSend\(null\)/);
 assert.match(community,/if\(changedAccountOrCommunity\)\{\s*uncertainSendRef\.current=null;setUncertainSend\(null\)/);
 assert.match(direct,/if\(conversation\.current!==identity\)\{\s*uncertainSendRef\.current=null;setUncertainSend\(null\)/);
 for(const s of [session,community,direct])
  assert.match(s,/uncertainSend\?\.identity===/);
});
