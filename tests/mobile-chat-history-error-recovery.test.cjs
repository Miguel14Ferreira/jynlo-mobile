'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

for(const file of ['app/messages/[peer].tsx','app/communities/[id]/chat.tsx','app/sessions/[id]/chat.tsx']){
 test(file+' clears only stale history errors after recovery',()=>{
  const source=read(file);
  assert.match(source,/const historyError=useRef<string\|null>\(null\)/);
  assert.match(source,/const previousHistoryError=historyError\.current;historyError\.current=null/);
  assert.match(source,/if\(previousHistoryError\)setError\(current=>current===previousHistoryError\?'':current\)/);
  assert.match(source,/historyError\.current=message;setError\(message\)/);
 });
}
test('community reconnect reconciles before a failure notice is cleared',()=>{
 const source=read('app/communities/[id]/chat.tsx');
 assert.match(source,/if\(status==='online'&&!wasConnected\)void refresh\(version,true\)/);
 assert.match(source,/setMessages\(old=>mergeMessages\(old,chat\)\)/);
 assert.match(source,/setRefreshWarning\(''\)/);
});
