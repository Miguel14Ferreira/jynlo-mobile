const untranslate=require('./untranslate.cjs');
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = untranslate(fs.readFileSync(path.join(__dirname, '../app/messages/[peer].tsx'), 'utf8'));

test('private chat history refresh does not acknowledge unseen messages', () => {
  const start = source.indexOf('const results=await directChatHistory(');
  const end = source.indexOf('}catch(e){', start);
  assert.ok(start >= 0 && end > start, 'history refresh implementation must be present');
  const refresh = source.slice(start, end);
  assert.doesNotMatch(refresh, /markDirectRead\s*\(/, 'refresh must not mark messages as read before viewport measurement');
});

test('private chat read receipts require active app and visible scroll viewport', () => {
 const start=source.indexOf('onScroll={event=>');
 const end=source.indexOf('scrollEventThrottle=',start);
 assert.ok(start>=0&&end>start,'scroll handler must be present');
 const scroll=source.slice(start,end);
 assert.match(scroll,/measuredHistoryKey\.current===historyKey/);
 assert.match(scroll,/historyViewportMeasured\.current=currentMeasurement/);
 assert.match(scroll,/nearBottom\.current/);
 assert.match(scroll,/latestVisibleAtBottom\.current/);
 assert.match(scroll,/acknowledgeVisibleHistory\(latestVisibleAtBottom\.current\)/);
 const acknowledge=source.slice(source.indexOf('const acknowledgeVisibleHistory='),start);
 assert.match(acknowledge,/AppState\.currentState!=='active'/);
 assert.match(acknowledge,/!blockStatusKnown\|\|blocked\|\|loading\|\|syncWarning/);
 assert.match(acknowledge,/markDirectRead\(peer,latest,auth\.token\)/);
});

test('private chat does not automatically scroll a reader browsing older messages', () => {
 assert.match(source,/onContentSizeChange=\{\(_,height\)=>\{/);
 assert.match(source,/else if\(nearBottom\.current&&historyViewportMeasured\.current\)/);
 assert.match(source,/conversationScroll\.current\?\.scrollToEnd\(\{animated:false\}\)/);
 assert.match(source,/nearBottom\.current=contentOffset\.y\+layoutMeasurement\.height>=historyContentHeight\.current-90/);
 assert.match(source,/latestVisibleAtBottom\.current=/);
});
