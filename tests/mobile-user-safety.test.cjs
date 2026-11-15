'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('user reporting and blocking use authenticated backend endpoints',()=>{
 const api=read('src/lib/user-safety-api.ts');
 assert.match(api,/\/api\/blocks\/users\//);
 assert.match(api,/\/api\/reports\/users\//);
 assert.match(api,/encodeURIComponent\(name\)/);
 assert.match(api,/method:'POST'/);
 assert.match(api,/method:'DELETE'/);
 assert.match(api,/body:\{reason:note\}/);
 assert.match(api,/if\(!token\|\|DEMO_MODE\)/);
 assert.match(api,/note\.length>1000/);
});

test('direct chat exposes reporting and blocking without allowing blocked sends',()=>{
 const screen=read('app/messages/[peer].tsx');
 assert.match(screen,/Segurança da conversa/);
 assert.match(screen,/Denunciar utilizador/);
 assert.match(screen,/Bloquear utilizador/);
 assert.match(screen,/Desbloquear utilizador/);
 assert.match(screen,/await reportUser\(peer,submittedReason,actorToken\)/);
 assert.match(screen,/await blockUser\(peer,actorToken\)/);
 assert.match(screen,/await unblockUser\(peer,actorToken\)/);
 assert.match(screen,/userBlockStatus\(peer,auth\.token\)/);
 assert.match(screen,/if\(mutationLock\.current\|\|sending\|\|sendingNow\.current\|\|pendingWrites\.current\.has\(identity\)\|\|blocked\|\|!blockStatusKnown\|\|!auth\.token/);
 assert.match(screen,/enabled=\{!blocked&&blockStatusKnown&&!sending&&!photoBusy\}/);
 assert.match(screen,/auth\.token&&!blocked\?<View style=\{styles\.composer\}>/);
});
