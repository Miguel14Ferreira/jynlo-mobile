const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/messages/[peer].tsx'),'utf8');

test('direct read receipts require visible last message, active app and known access',()=>{
 assert.match(source,/const acknowledgeVisibleHistory=useCallback/);
 assert.match(source,/!blockStatusKnown\|\|blocked\|\|loading\|\|syncWarning/);
 assert.match(source,/AppState\.currentState!=='active'/);
 assert.match(source,/latestVisibleAtBottom\.current=historyViewportMeasured\.current&&/);
 assert.match(source,/contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-2/);
 assert.match(source,/acknowledgeVisibleHistory\(latestVisibleAtBottom\.current\)/);
});
test('short history receipt works regardless of layout/content measurement order',()=>{
 assert.match(source,/onLayout=\{event=>\{/);
 assert.match(source,/onContentSizeChange=\{\(_,height\)=>\{/);
 assert.match(source,/historyContentHeight\.current<=historyViewportHeight\.current/);
 assert.match(source,/height<=historyViewportHeight\.current/);
 assert.match(source,/acknowledgeVisibleHistory\(true\)/);
});
test('near-bottom tolerance is not used for read receipts',()=>{
 assert.match(source,/contentSize\.height-90/);
 assert.match(source,/contentSize\.height-2/);
 assert.match(source,/generation\.current===version/);
});

test('read measurements are bound to the rendered message history',()=>{
 assert.match(source,/const measuredHistoryKey=useRef\(''\)/);
 assert.match(source,/const historyKey=messages\.map\(item=>item\.id\)\.join\(','\)/);
 assert.match(source,/if\(measuredHistoryKey\.current!==historyKey\)return/);
 assert.match(source,/measuredHistoryKey\.current=historyKey/g);
 assert.match(source,/measuredHistoryKey\.current=''/);
 assert.match(source,/historyContentHeight\.current<=historyViewportHeight\.current&&measuredHistoryKey\.current===historyKey/);
});
