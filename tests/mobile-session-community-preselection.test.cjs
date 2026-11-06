'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/sessions/create.tsx'),'utf8');

test('community preselection is specific to the account and source community',()=>{
 assert.match(source,/const communityLoadVersion=useRef\(0\),communityLoadIdentity=useRef\(''\)/);
 assert.match(source,/communityLoadIdentity\.current!==identity/);
 assert.match(source,/preselectionApplied\.current=false/);
 assert.match(source,/setCommunityMode\('INDEPENDENT'\)/);
 assert.match(source,/setForm\(previous=>changeCommunityMode\(previous,'INDEPENDENT'\)\)/);
 assert.match(source,/setCommunities\(\[\]\);setCommunityError\(''\);setCommunitySearch\(''\)/);
});

test('late community responses cannot overwrite the active session editor',()=>{
 assert.match(source,/const loadCommunities=useCallback\(async\(version=communityLoadVersion\.current\)=>/);
 assert.match(source,/if\(version!==communityLoadVersion\.current\)return/);
 assert.match(source,/const version=\+\+communityLoadVersion\.current/);
 assert.match(source,/return \(\)=>\{communityLoadVersion\.current\+\+;\}/);
 assert.match(source,/if\(version===communityLoadVersion\.current\)\{/);
});

test('a community shortcut preselects a valid member community and its sport only',()=>{
 assert.match(source,/const chosen=groups\.find\(c=>c\.id===requestedCommunityId\)/);
 assert.match(source,/const sports=communitySports\(chosen\)/);
 assert.match(source,/sports\.includes\(params\.sport\)&&SPORTS\.includes\(params\.sport\)/);
 assert.match(source,/sports\.length===1/);
 assert.match(source,/communityId:chosen\.id/);
 assert.match(source,/communityRankingsEnabled:chosen\.rankingsEnabled/);
 assert.match(source,/Já não pertences a esta comunidade/);
});
