const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('permanent team details open challenges lazily without changing roster/chat navigation',()=>{
 const detail=read('app/teams/[id].tsx');
 assert.match(detail,/\|'CHALLENGES'(\|'[A-Z]+')*>\(tab==='CHAT'\?'CHAT':tab==='FEED'\?'FEED':'OVERVIEW'\)/);
 assert.match(detail,/id:'CHALLENGES',label:'Desafios'/);
 assert.match(detail,/activeTab==='CHALLENGES'&&team\?/);
 assert.match(detail,/<SportsTeamChallengesPanel teamId=\{teamId\} token=\{auth\.token\}/);
 assert.match(detail,/isOwner=\{isOwner&&rosterVerified\}/);
 const team=detail.indexOf('activeTab===\'OVERVIEW\'');
 const challenges=detail.indexOf('activeTab===\'CHALLENGES\'');
 assert.ok(team>=0&&challenges>=0);
});
test('native challenge actions use authenticated server decisions and never auto-enroll players',()=>{
 const api=read('src/lib/sports-team-challenges-api.ts');
 const panel=read('src/components/SportsTeamChallengesPanel.tsx');
 assert.match(api,/api\/team-challenges\/teams\//);
 assert.match(api,/issueTeamChallenge\(teamId:number,challengedTeamId:number,message:string,token:string\|null\)/);
 assert.match(api,/answerTeamChallenge\(id:number,accept:boolean,token:string\|null\)/);
 assert.match(api,/cancelTeamChallenge\(id:number,token:string\|null\)/);
 assert.match(api,/linkTeamChallengeSession\(id:number,sessionId:number,token:string\|null\)/);
 assert.match(panel,/item\.challengedTeamId===teamId/);
 assert.match(panel,/item\.challengerTeamId===teamId/);
 assert.match(panel,/item\.status==='ACCEPTED'&&!item\.sessionId/);
 assert.match(panel,/!token\)return <Text/);
 assert.doesNotMatch(panel,/joinSessionWith/);
});
test('challenge linking selects actual eligible owned public sessions instead of arbitrary IDs',()=>{
 const panel=read('src/components/SportsTeamChallengesPanel.tsx');
 assert.match(panel,/request<MySessions>\('\/api\/sessions\/mine',\{token\}\)/);
 assert.match(panel,/mine\.created\.filter\(game=>!game\.privateGame&&game\.audience!=='COMMUNITY_ONLY'/);
 assert.match(panel,/ownSessions\.some\(game=>String\(game\.id\)===sessionInputs\[item\.id\]\)/);
 assert.match(panel,/router\.push\('\/\(tabs\)\/create'\)/);
 assert.match(panel,/String\(game\.id\)/);
});
test('after challenge mutation, release action lock before reloading the list',()=>{
 const panel=read('src/components/SportsTeamChallengesPanel.tsx');
 assert.match(panel,/writing\.current=false;setBusy\(false\)/);
 assert.match(panel,/if\(confirmed\)void reload\(\)/);
 assert.match(panel,/searchVersion\.current\+\+;setQuery\(value\)/);
 assert.doesNotMatch(panel,/await reload\(\);\s*\}catch/);
});

test('challenge inbox refreshes quietly on focus without a manual refresh button',()=>{
 const panel=read('src/components/SportsTeamChallengesPanel.tsx');
 assert.match(panel,/setInterval\(\(\)=>\{if\(!writing\.current\)void reload\(true\);\},30000\)/);
 assert.match(panel,/clearInterval\(interval\)/);
 assert.match(panel,/if\(!silent\)setLoading\(true\)/);
 assert.match(panel,/if\(isOwner\)void reload\(\)/);
 assert.doesNotMatch(panel,/Verificar desafios/);
 assert.match(panel,/Os convites e respostas são privados dos responsáveis/);
});
