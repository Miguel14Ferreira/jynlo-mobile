'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('team profile has focused tabs with active state and avoids mixing chat with roster',()=>{
 const screen=read('app/teams/[id].tsx');
 for(const name of ['Plantel e clube','🏆 Troféus','Publicações','Mensagens'])assert.ok(screen.includes(name),name);
 for(const tab of ['OVERVIEW','TROPHIES','FEED','CHAT'])assert.ok(screen.includes("activeTab==='"+tab+"'"));
 assert.match(screen,/accessibilityRole="tab"/);
 assert.match(screen,/accessibilityState=\{\{selected:activeTab===tab\.id\}\}/);
 assert.match(screen,/activeTab==='FEED'\?<View/);
 assert.match(screen,/activeTab==='CHAT'\?<View/);
 assert.doesNotMatch(screen,/activeTab==='OVERVIEW'\?<View style=\{styles\.panel\}><Text style=\{styles\.heading\}>Feed/);
});

test('roster cards navigate to athlete profiles and owner can remove confirmed players',()=>{
 const screen=read('app/teams/[id].tsx');
 const api=read('src/lib/sports-teams-api.ts');
 assert.match(screen,/pathname:'\/social\/\[username\]'/);
 assert.match(screen,/params:\{username:m\.username\}/);
 assert.match(screen,/removeSportsTeamMember\(teamId,member\.profileId,auth\.token!\)/);
 assert.match(screen,/Alert\.alert\('Remover jogador\?'/);
 assert.match(screen,/member\.role==='OWNER'\)return/);
 assert.match(screen,/isOwner&&m\.role!=='OWNER'/);
 assert.match(screen,/!rosterVerified/);
 assert.match(screen,/setMembers\(current=>current\.filter\(item=>item\.profileId!==member\.profileId\)\)/);
 assert.match(screen,/void load\(true,true\)/);
 assert.match(api,/method:'DELETE'/);
});

test('owner search has a clear no-result state and invite has confirmation',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/returnKeyType="search" onSubmitEditing=\{\(\)=>void search\(\)\}/);
 assert.match(screen,/setSearchComplete\(true\)/);
 assert.match(screen,/searchComplete&&inviteCandidates\.length===0/);
 assert.match(screen,/Convite enviado\. O jogador entra no plantel depois de aceitar/);
 assert.match(screen,/searchVersion\.current\+\+/);
 assert.match(screen,/setCandidates\(\[\]\)/);
});

test('team competitions and associated communities have working detail navigation',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/pathname:'\/communities\/\[id\]'/);
 assert.match(screen,/params:\{id:String\(m\.communityId\)\}/);
 assert.match(screen,/pathname:'\/tournaments\/\[communityId\]\/\[id\]'/);
 assert.match(screen,/params:\{communityId:String\(item\.communityId\),id:String\(item\.tournamentId\)\}/);
 assert.match(screen,/Ver histórico e troféus/);
 assert.match(screen,/setActiveTab\('TROPHIES'\)/);
});

test('owner permissions work with normalized handles and fail closed on unreadable roster',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/const isOwner=rosterVerified&&/);
 assert.match(screen,/const isMember=rosterVerified&&/);
 assert.match(screen,/m\.username\.toLowerCase\(\)===auth\.username!\.toLowerCase\(\)/);
 assert.match(screen,/else\{setRosterVerified\(false\);failed\.push\('o plantel'\);\}/);
});

test('community exits require confirmation and verified membership, with safe reconciliation',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/Alert\.alert\('Sair da comunidade\?'/);
 assert.match(screen,/onPress=\{\(\)=>confirmLeaveCommunity\(m\)\}/);
 assert.match(screen,/if\(!auth\.token\|\|saving\|\|!communitiesVerified\)return/);
 assert.match(screen,/setCommunitiesVerified\(false\)/);
 assert.match(screen,/communitiesVerified\?communities\.filter/);
 assert.match(screen,/isOwner&&communitiesVerified\?communities\.filter/);
 assert.match(screen,/setCommunities\(current=>current\.filter\(item=>item\.id!==id\)\)/);
 assert.match(screen,/A saída foi enviada, mas não foi possível confirmar a lista atual/);
});

test('invitation results exclude current squad members and link to public profiles',()=>{
 const screen=read('app/teams/[id].tsx');
 assert.match(screen,/const inviteCandidates=candidates\.filter\(p=>!members\.some\(m=>m\.profileId===p\.profileId\)\)/);
 assert.match(screen,/inviteCandidates\.map\(p=><View/);
 assert.match(screen,/params:\{username:p\.username\}/);
 assert.match(screen,/Não encontrámos novos jogadores com essa pesquisa/);
});
