'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/components/SessionChatPanel.tsx'),'utf8');

test('embedded session refresh does not acknowledge unseen messages before viewport scroll',()=>{
  const refresh=source.slice(source.indexOf('const refresh=useCallback('),source.indexOf('const previousHistoryError='));
  assert.match(refresh,/sessionChatHistory\(id,auth\.token\)/);
  const readGuard=source.slice(source.indexOf('const latest=history.reduce('),source.indexOf('}catch(e){',source.indexOf('const latest=history.reduce(')));
  assert.match(readGuard,/!embedded/);
  assert.doesNotMatch(readGuard,/\|\|inlineNearBottom\.current/);
});

test('embedded session marks read at the actual bottom and retries failed receipts',()=>{
  const viewport=source.slice(source.indexOf('onScroll={event=>'),source.indexOf('onContentSizeChange=',source.indexOf('onScroll={event=>')));
  assert.match(viewport,/contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-90/);
  assert.match(viewport,/if\(inlineNearBottom\.current\)/);
  assert.match(viewport,/markSessionChatRead\(id,latest,auth\.token\)/);
  assert.match(viewport,/\.catch\(\(\)=>\{if\(lastAcknowledgedMessageId\.current===latest\)lastAcknowledgedMessageId\.current=0;/);
});
