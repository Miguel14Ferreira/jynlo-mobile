'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('page defaults to normal scroll and only opts into chat autoscroll',()=>{
 const ui=read('src/components/UI.tsx');
 assert.match(ui,/autoScrollToEnd=false/);
 assert.match(ui,/nearBottom=useRef\(true\)/);
 assert.match(ui,/nearBottom\.current=contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-90/);
 assert.match(ui,/if\(nearBottom\.current\)scrollRef\.current\?\.scrollToEnd\(\{animated:false\}\)/);
});
test('community and session chats follow the latest message',()=>{
 assert.match(read('app/communities/[id]/chat.tsx'),/return <Page autoScrollToEnd>/);
 assert.match(read('app/sessions/[id]/chat.tsx'),/return <Page autoScrollToEnd><Brand/);
});
test('private chat keeps its own history-aware scrolling',()=>{
 const source=read('app/messages/[peer].tsx');
 assert.match(source,/nearBottom\.current=contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-90/);
 assert.match(source,/if\(nearBottom\.current\)conversationScroll\.current\?\.scrollToEnd/);
});
