'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../app/sessions/[id].tsx'),'utf8');
const preview=code.slice(code.indexOf('async function previewBalancedTeams()'),code.indexOf('function persistBalancedTeams()'));
const confirm=code.slice(code.indexOf('function persistBalancedTeams()'),code.indexOf('const renderTeam='));

test('team preview uses synchronous lock and rejects results for obsolete session',()=>{
 assert.match(code,/const teamsInFlight=useRef\(false\),teamsOperation=useRef\(0\)/);
 assert.match(preview,/if\(!auth\.token\|\|!owner\|\|!detail\|\|teamsInFlight\.current\)return/);
 assert.match(preview,/teamsInFlight\.current=true/);
 assert.ok(preview.indexOf('teamsInFlight.current=true')<preview.indexOf('await suggestSessionTeams('));
 assert.match(preview,/request===teamsOperation\.current&&epoch===actionEpoch\.current&&/);
 assert.match(preview,/version===detailRequestGeneration\.current\)setTeamPreview\(suggestion\)/);
});
test('confirmation popup validates the session again and blocks rapid double taps',()=>{
 assert.match(confirm,/const actorToken=auth\.token,selectedPreview=teamPreview/);
 assert.match(confirm,/if\(teamsInFlight\.current\|\|version!==detailRequestGeneration\.current\|\|/);
 assert.match(confirm,/epoch!==actionEpoch\.current\)return/);
 assert.match(confirm,/teamsInFlight\.current=true/);
 assert.match(confirm,/confirmSessionTeams\(id,actorToken,mode,selectedPreview\)/);
 assert.ok(confirm.indexOf('teamsInFlight.current=true')<confirm.indexOf('confirmSessionTeams('));
 assert.match(confirm,/request!==teamsOperation\.current\|\|epoch!==actionEpoch\.current\|\|/);
});
test('background roster refresh cannot invalidate in-progress team mutations',()=>{
 const sync=code.slice(code.indexOf('const syncSession=useCallback('),code.indexOf('useFocusEffect(useCallback('));
 assert.match(sync,/attendanceInFlight\.current\|\|teamsInFlight\.current\|\|!auth\.token/);
 assert.match(sync,/attendanceInFlight\.current\|\|teamsInFlight\.current\)return/);
 assert.match(code,/teamsOperation\.current\+\+;teamsInFlight\.current=false/);
 assert.match(confirm,/if\(request===teamsOperation\.current\)\{\s*teamsInFlight\.current=false/);
});
