const untranslate=require('./untranslate.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = untranslate(fs.readFileSync(path.join(__dirname, '../src/components/CommunityChatPanel.tsx'), 'utf8'));

test('community refresh never acknowledges history without a measured viewport', () => {
  const start = source.indexOf('const refresh=useCallback(');
  const end = source.indexOf('useFocusEffect(', start);
  assert.ok(start >= 0 && end > start, 'history refresh must exist');
  assert.doesNotMatch(source.slice(start, end), /markCommunityRead\(/);
  assert.match(source, /const inlineNearBottom=useRef\(false\)/);
  assert.match(source, /inlineNearBottom\.current=false;setHistoryLimit\(40\)/);
});

test('community WebSocket delivery never acknowledges unseen messages', () => {
  // The socket is only an invalidation hint: messages reach the UI through the
  // authenticated HTTP refresh, which itself never acknowledges (test above).
  const start = source.indexOf('onMessage:(_msg)=>');
  const end = source.indexOf('// Real-time events normally', start);
  assert.ok(start >= 0 && end > start, 'WebSocket message handler must exist');
  const handler = source.slice(start, end);
  assert.match(handler, /void refresh\(version,true\)/);
  assert.doesNotMatch(handler, /setMessages\(/);
  assert.doesNotMatch(handler, /markCommunityRead\(/);
});

test('embedded community scroll still acknowledges after reaching bottom', () => {
  const start = source.indexOf('onScroll={event=>');
  const end = source.indexOf('onContentSizeChange=', start);
  assert.ok(start >= 0 && end > start, 'embedded viewport scroll handler must exist');
  const handler = source.slice(start, end);
  assert.match(handler, /inlineNearBottom\.current=contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-90/);
  assert.match(handler, /markCommunityRead\(id,latest,auth\.token,auth\.username\)/);
});
