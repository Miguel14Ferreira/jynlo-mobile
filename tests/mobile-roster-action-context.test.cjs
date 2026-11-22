const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=untranslate(fs.readFileSync(path.join(__dirname,'../app/sessions/[id].tsx'),'utf8'));

const removal=code.slice(code.indexOf('function confirmRemoveParticipant('),code.indexOf('function confirmAttendance('));
const attendance=code.slice(code.indexOf('function confirmAttendance('),code.indexOf('const sendInvite='));

for(const [name,operation] of [['removal',removal],['attendance',attendance]]){
 test(name+' uses the initiating identity and rejects stale API completion',()=>{
  assert.match(operation,/const actionVersion=detailRequestGeneration\.current,actionContext=actionEpoch\.current/);
  assert.match(operation,/const actorToken=auth\.token/);
  assert.match(operation,/if\(actionVersion!==detailRequestGeneration\.current\|\|actionContext!==actionEpoch\.current\)return/);
  assert.match(operation,/if\(actionContext===actionEpoch\.current\)\s*setRosterFeedback\(/);
  assert.match(operation,/if\(actionContext!==actionEpoch\.current\)return/);
  assert.match(operation,/if\(actionContext===actionEpoch\.current\)set\w+ParticipantId\(null\)/);
 });
}
test('focus cleanup invalidates feedback from a previous session or account',()=>{
 assert.match(code,/detailRequestGeneration\.current\+\+;actionEpoch\.current\+\+;/);
});
