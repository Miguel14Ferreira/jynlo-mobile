'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const screen=fs.readFileSync(path.join(__dirname,'../app/sessions/[id].tsx'),'utf8');
const sync=screen.slice(screen.indexOf('const syncSession=useCallback('),screen.indexOf('useFocusEffect(useCallback(',screen.indexOf('const syncSession=useCallback(')));

test('session detail polls authoritative roster while open and refreshes when app resumes',()=>{
 assert.match(screen,/AppState\.currentState==='active'/);
 assert.match(screen,/setInterval\(\(\)=>\{/);
 assert.match(screen,/\},15000\)/);
 assert.match(screen,/AppState\.addEventListener\('change',state=>/);
 assert.match(screen,/clearInterval\(timer\);resume\.remove\(\)/);
 assert.match(sync,/await sessionDetail\(id,auth\.token,auth\.username\|\|undefined\)/);
 assert.match(sync,/await sessionParticipants\(id,auth\.token\)/);
 assert.match(sync,/setDetail\(updated\)/);
 assert.match(sync,/setParticipants\(roster\)/);
});

test('background synchronization skips mutations, overlapping calls and full foreground loads',()=>{
 assert.match(sync,/backgroundSyncInFlight\.current\|\|foregroundLoadVersion\.current!==null/);
 assert.match(sync,/operationInFlight\.current/);
 assert.match(sync,/removalInFlight\.current/);
 assert.match(sync,/attendanceInFlight\.current/);
 assert.match(sync,/version!==detailRequestGeneration\.current\|\|epoch!==actionEpoch\.current/);
 assert.match(screen,/if\(foregroundLoadVersion\.current===version\)foregroundLoadVersion\.current=null/);
});

test('automatic refresh does not clear editor drafts or mark a player present without server confirmation',()=>{
 assert.doesNotMatch(sync,/setMeetingDraft\(|setExternalDraft\(|setPassword\(|setDraft\(|joinSession\(|leaveSession\(|answerSessionInvite\(/);
 assert.doesNotMatch(sync,/setTeamPreview\(null\)/);
 assert.match(sync,/if\(canViewRoster\(updated,auth\.username\)\)/);
 assert.match(sync,/let roster:SessionParticipant\[\]=\[\]/);
 assert.match(sync,/setParticipants\(roster\)/);
});

test('permission revocation hides private roster, while network interruptions retain visible data',()=>{
 assert.match(sync,/if\(e instanceof ApiError&&\[401,403,404,410\]\.includes\(e\.status\)\)/);
 assert.match(sync,/setDetail\(null\);setParticipants\(\[\]\);setTeamPreview\(null\)/);
 const handler=sync.slice(sync.indexOf('}catch(e){'));
 assert.ok(!handler.includes('setDetail(null)')||handler.indexOf('setDetail(null)')>handler.indexOf('if(e instanceof ApiError'));
});
