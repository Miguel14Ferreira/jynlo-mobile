const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=untranslate(fs.readFileSync(path.join(__dirname,'../app/sessions/[id].tsx'),'utf8'));
const load=code.slice(code.indexOf('const load=useCallback('),code.indexOf('// Read-only synchronization:'));
const confirm=code.slice(code.indexOf('function persistBalancedTeams()'),code.indexOf('const renderTeam='));

test('confirmed server team result is rendered after authenticated session reload',()=>{
 assert.match(confirm,/\.then\(async result=>\{/);
 assert.match(confirm,/const refreshed=await load\(\)/);
 assert.match(confirm,/refreshed&&isOrganizer\(refreshed,auth\.username\)/);
 assert.match(confirm,/setTeamPreview\(result\)/);
 assert.ok(confirm.indexOf('const refreshed=await load()')<confirm.indexOf('setTeamPreview(result)'));
 assert.match(confirm,/setTeamsMessage\('Equipas confirmadas pelo servidor\.'\)/);
});
test('no confirmed roster is restored following failed or anonymous refresh',()=>{
 assert.match(load,/async\(\):Promise<SessionDetail\|null>/);
 assert.match(load,/return version===detailRequestGeneration\.current&&isOrganizer\(full,auth\.username\)\?full:null/);
 assert.match(load,/const publicPreview=await sessionPreview\(id\);[\s\S]*?setPreview\(publicPreview\);\s*return null/);
 assert.match(load,/\}catch\(e\)\{[\s\S]*?return null/);
 assert.match(confirm,/if\(request!==teamsOperation\.current\|\|epoch!==actionEpoch\.current\)return/);
});

test('successful team POST reports refresh uncertainty without claiming confirmation failed',()=>{
 assert.match(confirm,/const refreshed=await load\(\)/);
 assert.match(confirm,/if\(request!==teamsOperation\.current\|\|epoch!==actionEpoch\.current\)return/);
 assert.match(confirm,/if\(refreshed&&isOrganizer\(refreshed,auth\.username\)\)\{/);
 assert.match(confirm,/O servidor confirmou as equipas, mas não foi possível validar a atualização do jogo/);
 const success=confirm.slice(confirm.indexOf('.then(async result=>'),confirm.indexOf('.catch(()=>'));
 assert.doesNotMatch(success,/setTeamsError\(/);
 assert.ok(success.indexOf('const refreshed=await load()')<success.indexOf('O servidor confirmou as equipas, mas'));
});
