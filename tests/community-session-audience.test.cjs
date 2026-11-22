const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=f=>untranslate(fs.readFileSync(path.join(__dirname,'..',f),'utf8'));
const a=require('../src/lib/community-session-audience.cjs');
const now=Date.parse('2026-11-21T12:00:00Z');
const base={status:'OPEN',gameDate:'2026-11-28T18:00:00Z',participantCount:4,maxParticipants:10,communityId:3};
test('owners/admins can open an upcoming members-only session with free places',()=>{
 assert.equal(a.canOpenToPublic({...base,audience:'COMMUNITY_ONLY'},true,now),true);
 assert.equal(a.canOpenToPublic({...base,audience:'COMMUNITY_ONLY'},false,now),false);
 assert.equal(a.canOpenToPublic({...base,audience:'COMMUNITY_ONLY',participantCount:10},true,now),false);
 assert.equal(a.canOpenToPublic({...base,audience:'COMMUNITY_ONLY',gameDate:'2026-11-20T18:00:00Z'},true,now),false);
});
test('and restrict a public session of this community back to members',()=>{
 assert.equal(a.canRestrictToMembers({...base,audience:'PUBLIC'},true,3,now),true);
 assert.equal(a.canRestrictToMembers({...base,audience:'PUBLIC',communityId:9},true,3,now),false);
 assert.equal(a.canRestrictToMembers({...base,audience:'PUBLIC',status:'CANCELLED'},true,3,now),false);
});
test('the community screen uses the server endpoints',()=>{
 assert.match(read('src/lib/community-api.ts'),/\$\{toPublic\?'open-public':'restrict-members'\}`,\{token,method:'POST'\}/);
 const screen=read('app/communities/[id].tsx');
 assert.match(screen,/Procurar jogadores fora da comunidade/);assert.match(screen,/Só membros da comunidade/);
});
