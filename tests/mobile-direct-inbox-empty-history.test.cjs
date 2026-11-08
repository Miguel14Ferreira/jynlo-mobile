'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/lib/chat-api.ts'),'utf8');

test('direct inbox retains server-authorized conversations with no latest message',()=>{
 assert.match(source,/const rawPeers=await directConversationPeers\(token\)/);
 assert.match(source,/if\(!returned\.has\(key\)\)visible\.push\(\{kind:'direct',id:peer,latestMessageId:null/);
 assert.doesNotMatch(source,/summaries\.filter\(s=>s\.kind==='direct'&&s\.latestMessageId!=null\)/);
});
test('private inbox still rejects unknown or malformed peers',()=>{
 assert.match(source,/if\(typeof peer!=='string'\|\|!/);
 assert.match(source,/if\(seen\.has\(key\)\)return false/);
 assert.match(source,/conversations:peers\.slice\(i,i\+100\)\.map\(id=>\(\{kind:'direct',id\}\)\)/);
});
