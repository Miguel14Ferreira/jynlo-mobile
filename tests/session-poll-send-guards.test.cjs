'use strict';
// Source-level regression guards only; not a substitute for integration/device tests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/components/SessionChatPanel.tsx'), 'utf8');
const poll = source.split('async function sendPoll(text:string)')[1]?.split('async function choosePhoto(')[0];
assert.ok(poll, 'session poll sender must exist');
test('session poll requires authenticated identity and an open chat', () => {
  for (const guard of ['closed','!auth.token','!auth.username','mutationLock.current','sendingNow.current','pendingWrites.current.has(identity)'])
    assert.ok(poll.includes(guard), 'missing guard: '+guard);
});
test('session poll verifies the server acknowledgement before inserting history', () => {
  const check = poll.indexOf('confirmedSessionChatSend(');
  const insert = poll.indexOf('setEntries(');
  assert.ok(check >= 0 && insert > check);
  assert.match(poll, /confirmedSessionChatSend\(confirmed,id,auth\.username\|\|'',text,null\)/);
});
test('session poll cannot mutate a different conversation after navigation', () => {
  assert.match(poll, /version!==generation\.current\|\|activeChat\.current!==identity/);
  assert.match(poll, /version===generation\.current&&activeChat\.current===identity/);
});
test('session poll suppresses uncertain duplicate retries', () => {
  assert.match(poll, /uncertainSendRef\.current\?\.identity===identity/);
  assert.match(poll, /uncertainSendRef\.current\.body===text/);
  assert.match(poll, /uncertainChatSend\(e\)/);
  assert.match(poll, /setUncertainSend\(uncertain\)/);
});
test('session poll releases the pending send lock', () => {
  assert.match(poll, /pendingWrites\.current\.set\(identity,'text'\)/);
  assert.match(poll, /finally\s*\{[\s\S]*?pendingWrites\.current\.delete\(identity\)/);
});
