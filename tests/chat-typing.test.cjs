const test=require('node:test');
const assert=require('node:assert/strict');
const {matches,label}=require('../src/lib/chat-typing-core.cjs');
const t=(k,p)=>p?k.replace('{name}',p.name):k;

test('typing events only match the open chat and never the person typing',()=>{
 const ev={kind:'community',conversationId:'12',username:'Ana',active:true};
 assert.equal(matches(ev,'community','12','miguel'),true);
 assert.equal(matches(ev,'community','13','miguel'),false);
 assert.equal(matches(ev,'session','12','miguel'),false);
 assert.equal(matches(ev,'community','12','ana'),false);
 assert.equal(matches({...ev,kind:'unknown'},'unknown','12','miguel'),false);
 assert.equal(matches({...ev,active:'yes'},'community','12','miguel'),false);
});

test('direct chats are keyed by the sender, case-insensitively',()=>{
 assert.equal(matches({kind:'direct',conversationId:'ana',username:'Ana',active:true},'direct','ANA','miguel'),true);
});

test('labels use the same wording as the website',()=>{
 assert.equal(label('direct',['Ana'],t),'A escrever…');
 assert.equal(label('team',['Ana'],t),'Ana está a escrever…');
 assert.equal(label('private',['Ana','Rui'],t),'Várias pessoas estão a escrever…');
 assert.equal(label('community',[],t),'');
});
