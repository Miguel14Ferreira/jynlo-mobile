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
 assert.match(preview,/if\(!auth\.token\|\|!owner\|\|!detail\|\|teamsInFlight\.current\|\|operationInFlight\.current\|\|/);
 assert.match(preview,/teamsInFlight\.current=true/);
 assert.ok(preview.indexOf('teamsInFlight.current=true')<preview.indexOf('await suggestSessionTeams('));
 assert.match(preview,/request===teamsOperation\.current&&epoch===actionEpoch\.current&&/);
 assert.match(preview,/version===detailRequestGeneration\.current\)setTeamPreview\(suggestion\)/);
});
test('confirmation popup validates the session again and blocks rapid double taps',()=>{
 assert.match(confirm,/const actorToken=auth\.token,selectedPreview=teamPreview/);
 assert.match(confirm,/if\(teamsInFlight\.current\|\|operationInFlight\.current\|\|removalInFlight\.current\|\|/);
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
 const focus=code.slice(code.indexOf('useFocusEffect(useCallback('),code.indexOf('const perform=async('));
 assert.match(focus,/setTeamsBusy\(teamsInFlight\.current\)/);
 assert.match(focus,/teamsOperation\.current\+\+/);
 assert.doesNotMatch(focus,/teamsInFlight\.current=false/);
 assert.match(confirm,/\.finally\(\(\)=>\{[\s\S]*?teamsInFlight\.current=false;[\s\S]*?setTeamsBusy\(false\)/);
 assert.match(preview,/finally\{[\s\S]*?teamsInFlight\.current=false;[\s\S]*?setTeamsBusy\(false\)/);
});

test('navigation does not unlock an unsettled confirmation request',()=>{
 const focus=code.slice(code.indexOf('useFocusEffect(useCallback('),code.indexOf('const perform=async('));
 assert.ok(focus.indexOf('teamsOperation.current++')>=0);
 assert.doesNotMatch(focus,/teamsInFlight\.current\s*=\s*false/);
 assert.match(confirm,/if\(teamsInFlight\.current\|\|operationInFlight\.current\|\|removalInFlight\.current/)
 assert.match(confirm,/\.finally\(\(\)=>\{[\s\S]*?teamsInFlight\.current=false/);
});
