const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/components/CommunityChatPanel.tsx'), 'utf8');

test('community refresh acknowledges only when the embedded viewport is at the bottom', () => {
  assert.match(source, /if\(embedded&&inlineNearBottom\.current&&last>lastAcknowledgedMessageId\.current\)/);
  assert.doesNotMatch(source, /!embedded\|\|inlineNearBottom\.current/);
});

test('community WebSocket delivery never acknowledges unseen messages', () => {
  const start = source.indexOf('onMessage:(msg)=>');
  const end = source.indexOf('// A disconnected WebSocket', start);
  assert.ok(start >= 0 && end > start, 'WebSocket message handler must exist');
  const handler = source.slice(start, end);
  assert.match(handler, /setMessages\(old=>mergeMessages\(old,\[msg\]\)\)/);
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
