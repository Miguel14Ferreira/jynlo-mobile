const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=untranslate(fs.readFileSync(path.join(__dirname,'../app/sessions/[id].tsx'),'utf8'));
const section=(start,end)=>code.slice(code.indexOf(start),code.indexOf(end,code.indexOf(start)));
const perform=section('const perform=async(','const s=detail||preview');
const removal=section('function confirmRemoveParticipant(','function confirmAttendance(');
const attendance=section('function confirmAttendance(','const sendInvite=');
const preview=section('async function previewBalancedTeams()','function persistBalancedTeams()');
const confirm=section('function persistBalancedTeams()','const renderTeam=');

test('session writes do not overlap with roster, attendance or team operations',()=>{
 assert.match(perform,/if\(operationInFlight\.current\|\|removalInFlight\.current\|\|attendanceInFlight\.current\|\|teamsInFlight\.current\)return/);
 for(const block of [removal,attendance,preview,confirm]){
  for(const guard of ['operationInFlight.current','removalInFlight.current','attendanceInFlight.current','teamsInFlight.current']){
   assert.ok(block.includes(guard),guard+' missing');
  }
 }
});

test('removal and attendance dialogs revalidate route and account before mutation',()=>{
 for(const block of [removal,attendance]){
  assert.match(block,/const promptVersion=detailRequestGeneration\.current,promptEpoch=actionEpoch\.current/);
  assert.match(block,/promptVersion!==detailRequestGeneration\.current/);
  assert.match(block,/promptEpoch!==actionEpoch\.current\)return/);
  assert.ok(block.indexOf('promptVersion!==detailRequestGeneration.current')<
            block.indexOf('.current=true;'),'guard must precede locking and POST');
 }
});

test('background updates wait for all mutations and do not race against writes',()=>{
 const sync=section('const syncSession=useCallback(','useFocusEffect(useCallback(');
 assert.match(sync,/operationInFlight\.current/);
 assert.match(sync,/removalInFlight\.current/);
 assert.match(sync,/attendanceInFlight\.current/);
 assert.match(sync,/teamsInFlight\.current/);
});
