const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=f=>untranslate(fs.readFileSync(path.join(__dirname,'..',f),'utf8'));
test('after a completed game, players can join the organising communities (server-verified)',()=>{
 const api=read('src/lib/post-game-communities-api.ts');
 assert.match(api,/\/api\/sessions\/\$\{vid\(sessionId\)\}\/post-game-communities`/);
 assert.match(api,/\/post-game-communities\/\$\{vid\(communityId\)\}\/join`,\{token,method:'POST'\}/);
 const card=read('src/components/PostGameCommunities.tsx');
 assert.match(card,/Gostaste de jogar com esta malta\?/);
 assert.match(card,/Agora não/);
 // Ineligible players see nothing (no red error), and a 403/409 removes the offer.
 assert.match(card,/\.catch\(\(\)=>\{if\(live\)setGroups\(\[\]\);\}\)/);
 assert.match(card,/e\.status===403\|\|e\.status===409/);
 const screen=read('app/sessions/[id].tsx');
 assert.match(screen,/detail\.status==='COMPLETED'&&detail\.joined&&auth\.token&&auth\.username\?\n\s*<PostGameCommunities/);
});
