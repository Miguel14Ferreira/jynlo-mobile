const untranslate=require('./untranslate.cjs');
'use strict';
// Regression contracts for community structured sends. These are source-level
// guards, not device or backend integration tests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = untranslate(fs.readFileSync(path.join(__dirname, '../src/components/CommunityChatPanel.tsx'), 'utf8'));
const structured = source.split('async function sendStructured(')[1]?.split('\n async function send(')[0];
assert.ok(structured, 'sendStructured implementation must exist');
test('structured sends are locked against simultaneous mutations and uploads', () => {
  for (const guard of ['mutationLock.current','sendingNow.current','uploadingNow.current','pendingWrites.current.has(identity)','revokedRef.current'])
    assert.ok(structured.includes(guard), 'missing guard: '+guard);
  assert.match(structured, /pendingWrites\.current\.set\(identity,'text'\)/);
  assert.match(structured, /finally\s*\{[\s\S]*?pendingWrites\.current\.delete\(identity\)/);
});
test('structured sends require authenticated identity', () => {
  assert.match(structured, /!auth\.token\|\|!auth\.username/);
  assert.match(structured, /sendCommunityMessage\(id,text,token,username\)/);
});
test('server acknowledgement is checked before inserting into history', () => {
  const receipt = structured.indexOf('confirmedCommunityChatSend(');
  const insert = structured.indexOf('setMessages(');
  assert.ok(receipt >= 0 && insert > receipt, 'history must only include confirmed messages');
});
test('stale responses cannot mutate a different chat', () => {
  assert.match(structured, /version!==generation\.current\|\|activeChat\.current!==identity/);
  assert.match(structured, /version===generation\.current&&activeChat\.current===identity/);
});
test('uncertain delivery is not automatically retried', () => {
  assert.match(structured, /uncertainSendRef\.current\?\.identity===identity/);
  assert.match(structured, /uncertainChatSend\(e\)/);
  assert.match(structured, /Confirma o histórico antes de repetir/);
});
test('both structured composers use the guarded send path', () => {
  assert.match(source, /await sendStructured\(text,'Não foi possível enviar a sondagem\.'/);
  assert.match(source, /await sendStructured\(encodeCallUp\(sessionId\),'Não foi possível enviar a convocatória\.'/);
});
