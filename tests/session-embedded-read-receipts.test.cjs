'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/components/SessionChatPanel.tsx'),'utf8');

test('refresh never acknowledges unseen session messages',()=>{
 const start=source.indexOf('const refresh=useCallback(');
 const end=source.indexOf('const previousHistoryError=',start);
 assert.ok(start>=0&&end>start,'session history refresh exists');
 const refresh=source.slice(start,end);
 assert.match(refresh,/sessionChatHistory\(id,auth\.token\)/);
 assert.doesNotMatch(refresh,/markSessionChatRead\(/);
});

test('embedded session marks read only at actual measured bottom and retries failures',()=>{
 const start=source.indexOf('onScroll={event=>');
 const end=source.indexOf('onContentSizeChange=',start);
 assert.ok(start>=0&&end>start,'session history viewport scroll handler exists');
 const viewport=source.slice(start,end);
 assert.match(source,/const inlineNearBottom=useRef\(false\)/);
 assert.match(viewport,/contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-90/);
 assert.match(viewport,/const lastMessageVisible=contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-4/);
 assert.match(viewport,/lastMessageVisible&&AppState\.currentState==='active'/);
 assert.match(viewport,/markSessionChatRead\(id,latest,auth\.token\)/);
 assert.match(viewport,/\.catch\(\(\)=>\{if\(lastAcknowledgedMessageId\.current===latest\)lastAcknowledgedMessageId\.current=0;/);
});
