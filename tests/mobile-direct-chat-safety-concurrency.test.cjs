const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const chat=untranslate(fs.readFileSync(path.join(__dirname,'../app/messages/[peer].tsx'),'utf8'));
const focus=chat.slice(chat.indexOf('useFocusEffect(useCallback('),chat.indexOf('async function updateBlock()'));
const blocking=chat.slice(chat.indexOf('async function updateBlock()'),chat.indexOf('async function submitReport()'));
const reporting=chat.slice(chat.indexOf('async function submitReport()'),chat.indexOf('async function send()'));

test('blocking and reporting share a synchronous lock before network calls',()=>{
 assert.match(chat,/const safetyInFlight=useRef\(false\)/);
 for(const action of [blocking,reporting]){
  assert.match(action,/if\(!auth\.token\|\|safetyInFlight\.current\|\|/);
  assert.match(action,/safetyInFlight\.current=true/);
  assert.ok(action.indexOf('safetyInFlight.current=true')<action.indexOf('await '));
  assert.match(action,/finally\{\s*safetyInFlight\.current=false;\s*setSafetyBusy\(false\)/);
 }
});
test('changing conversation retains the lock but discards stale UI changes',()=>{
 assert.match(focus,/setSafetyBusy\(safetyInFlight\.current\)/);
 for(const action of [blocking,reporting]){
  assert.match(action,/version=generation\.current/);
  assert.match(action,/conversation\.current!==identity\|\|version!==generation\.current/);
  assert.match(action,/conversation\.current===identity&&version===generation\.current/);
 }
});
test('report submission snapshots input and preserves edits during upload',()=>{
 assert.match(reporting,/const actorToken=auth\.token,submittedReason=reportReason\.trim\(\)/);
 assert.match(reporting,/reportUser\(peer,submittedReason,actorToken\)/);
 assert.match(reporting,/setReportReason\(current=>current===submittedReason\?'':current\)/);
 assert.doesNotMatch(reporting,/setReportReason\(''\)/);
});

test('a late initial block-status lookup cannot override a confirmed block toggle',()=>{
 assert.match(focus,/const blockRequest=\+\+blockCheckRequest\.current/);
 assert.match(focus,/blockCheckRequest\.current===blockRequest/);
 assert.match(blocking,/\+\+blockCheckRequest\.current/);
 assert.ok(blocking.indexOf('++blockCheckRequest.current')<blocking.indexOf('await unblockUser('));
 assert.match(blocking,/setBlocked\(value\);setBlockStatusKnown\(true\)/);
});
