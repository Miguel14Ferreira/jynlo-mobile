const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const screen=untranslate(fs.readFileSync(path.join(__dirname,'../app/sessions/[id].tsx'),'utf8'));
const dialogs=screen.slice(screen.indexOf('const leave=()=>{'),screen.indexOf('function confirmRemoveParticipant('));
const leave=dialogs.slice(dialogs.indexOf('const leave=()=>{'),dialogs.indexOf('const cancel=()=>{'));
const cancel=dialogs.slice(dialogs.indexOf('const cancel=()=>{'));

for(const [name,code,method] of [['leave',leave,'leaveSession'],['cancel',cancel,'cancelSession']]){
 test(name+' captures current actor and rejects confirmation after session or account changes',()=>{
  assert.match(code,/const promptVersion=detailRequestGeneration\.current,promptEpoch=actionEpoch\.current/);
  assert.match(code,/const actorToken=auth\.token,actorUsername=auth\.username/);
  assert.match(code,/promptVersion!==detailRequestGeneration\.current\|\|promptEpoch!==actionEpoch\.current\)return/);
  assert.match(code,new RegExp(method+'\\(id,actorToken,actorUsername\\|\\|undefined\\)'));
  assert.doesNotMatch(code,new RegExp(method+'\\(id,auth\\.token'));
  assert.ok(code.indexOf('promptEpoch!==actionEpoch.current')<code.indexOf('void perform('));
 });
}
test('cancellation requires current organizer and leaving requires server-confirmed participation',()=>{
 assert.match(leave,/if\(!auth\.token\|\|!detail\|\|!canLeave\(detail\)\)return/);
 assert.match(cancel,/if\(!auth\.token\|\|!detail\|\|!owner\)return/);
 assert.match(screen,/detailRequestGeneration\.current\+\+;actionEpoch\.current\+\+/);
});
