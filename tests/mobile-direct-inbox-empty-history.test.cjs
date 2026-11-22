const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/chat-api.ts'),'utf8'));

test('direct inbox retains server-authorized conversations with no latest message',()=>{
 assert.match(source,/const rawPeers=await directConversationPeers\(token\)/);
 assert.match(source,/filterAuthorizedDirectSummaries\(authorized,summaries\)/);
 const helper=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/authorized-inbox-summaries.cjs'),'utf8'));
 assert.match(helper,/if\(!returned\.has\(key\)\&\&typeof peer==='string'\&\&peer\)/);
 assert.doesNotMatch(source,/summaries\.filter\(s=>s\.kind==='direct'&&s\.latestMessageId!=null\)/);
});
test('private inbox still rejects unknown or malformed peers',()=>{
 assert.match(source,/if\(typeof peer!=='string'\|\|!/);
 assert.match(source,/if\(seen\.has\(key\)\)return false/);
 assert.match(source,/conversations:peers\.slice\(i,i\+100\)\.map\(id=>\(\{kind:'direct',id\}\)\)/);
});
