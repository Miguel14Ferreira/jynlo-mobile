'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('publicações podem ir para o feed de uma comunidade ou equipa',()=>{
 const api=read('src/lib/social-feed-api.ts');
 assert.match(api,/'\/api\/communities\/'\+destination\.id\+'\/posts'/);
 assert.match(api,/sendMedia\(path,\{content:caption\},files,token,'POST',true\)/);
 assert.match(api,/'\/api\/teams\/'\+destination\.id\+'\/feed'/);
 assert.match(api,/scope:'team',id:destination\.id,kind:'feed'/);
 const home=read('app/(tabs)/index.tsx');
 assert.match(home,/myCommunities\(token,username\),mySportsTeams\(token\)/);
 assert.match(home,/await publishPostTo\(destination,body,media,actor,username\)/);
 // Location and game links belong to profile posts only.
 assert.match(home,/postDestinations\.length&&!composerSessionId/);
 assert.match(home,/\{postDestination\?<Text style=\{styles\.storiesIntro\}>/);
});
test('organizadores decidem quem publica: comunidade e equipa',()=>{
 const api=read('src/lib/community-api.ts');
 assert.match(api,/\/posting-policy`,\{token,method:'PUT',body:\{membersCanPost\}\}/);
 const home=read('app/(tabs)/index.tsx');
 assert.match(home,/group\.membersCanPost!==false\|\|group\.myRole==='OWNER'\|\|group\.myRole==='ADMIN'/);
 assert.match(home,/group\.myRole==='ADMIN'\|\|group\.membersCanPost===true/);
 const team=read('app/teams/[id].tsx');
 assert.match(team,/field==='membersCanPost'\?team\.membersCanPost===false/);
});
