'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const screen=fs.readFileSync(path.join(__dirname,'../app/sessions/[id].tsx'),'utf8');

test('two rapid session actions cannot issue duplicate mutations',()=>{
 const perform=screen.slice(screen.indexOf('const perform=async('),screen.indexOf('const s=detail||preview'));
 assert.match(screen,/const operationInFlight=useRef\(false\)/);
 assert.match(perform,/if\(operationInFlight\.current\|\|removalInFlight\.current\|\|attendanceInFlight\.current\|\|teamsInFlight\.current\)return/);
 assert.match(perform,/operationInFlight\.current=true/);
 assert.match(perform,/const result=await operation\(\)/);
 assert.match(perform,/operationInFlight\.current=false/);
 assert.ok(perform.indexOf('operationInFlight.current=true')<perform.indexOf('await operation()'));
});

test('session mutation response cannot report success for another route or user',()=>{
 const perform=screen.slice(screen.indexOf('const perform=async('),screen.indexOf('const s=detail||preview'));
 assert.match(perform,/const version=detailRequestGeneration\.current/);
 assert.match(perform,/if\(version!==detailRequestGeneration\.current\)return/);
 assert.match(perform,/if\(version===detailRequestGeneration\.current\)/);
});

test('busy state recovers after load refresh yet does not affect a newly focused route',()=>{
 assert.match(screen,/const actionEpoch=useRef\(0\)/);
 assert.match(screen,/detailRequestGeneration\.current\+\+;actionEpoch\.current\+\+/);
 const perform=screen.slice(screen.indexOf('const perform=async('),screen.indexOf('const s=detail||preview'));
 assert.match(perform,/const epoch=actionEpoch\.current/);
 assert.match(perform,/await load\(\)/);
 assert.match(perform,/if\(epoch===actionEpoch\.current\)setBusy\(false\)/);
});

test('session join only reports confirmed server membership or waitlist',()=>{
 assert.match(screen,/const confirmed=confirmedSessionJoin\(result\)/);
 assert.match(screen,/if\(!confirmed\)throw Error\('O servidor respondeu, mas não confirmou a entrada no jogo/);
 assert.match(screen,/return confirmed/);
 assert.match(screen,/\(result\)=>\(result as \{message:string\}\)\.message/);
});

test('session refocus retains an unsettled mutation busy state',()=>{
 const focused=screen.slice(screen.indexOf('useFocusEffect(useCallback('),screen.indexOf('const perform=async('));
 assert.match(focused,/setBusy\(operationInFlight\.current\|\|removalInFlight\.current\|\|attendanceInFlight\.current\)/);
 assert.doesNotMatch(focused,/setBusy\(false\)/);
});
test('joined session cannot erase a newly edited password after a slow response',()=>{
 const join=screen.slice(screen.indexOf('const join=()=>'),screen.indexOf('const leave=()=>'));
 assert.match(join,/const actorToken=auth\.token,actorUsername=auth\.username,submittedPassword=password/);
 assert.match(join,/joinSession\(id,actorToken,actorUsername\|\|undefined,submittedPassword\)/);
 assert.match(join,/operationVersion===detailRequestGeneration\.current&&operationEpoch===actionEpoch\.current/);
 assert.match(join,/setPassword\(current=>current===submittedPassword\?'':current\)/);
});
test('sent session invite keeps newer draft and cannot cross account changes',()=>{
 const invite=screen.slice(screen.indexOf('const sendInvite=()=>'),screen.indexOf('const share=()=>'));
 assert.match(invite,/const actorToken=auth\.token,actorUsername=auth\.username/);
 assert.match(invite,/inviteToSession\(id,invitee,actorToken,actorUsername\|\|undefined\)/);
 assert.match(invite,/operationVersion===detailRequestGeneration\.current&&operationEpoch===actionEpoch\.current/);
 assert.match(invite,/setInviteUsername\(current=>current\.trim\(\)===invitee\?'':current\)/);
});
