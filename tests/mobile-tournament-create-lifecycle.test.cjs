'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/tournaments/create.tsx'),'utf8');

test('tournament creator resets private draft when account or source community changes',()=>{
 assert.match(source,/const generation=useRef\(0\),identityRef=useRef\(''\)/);
 assert.match(source,/identityRef\.current!==identity/);
 assert.match(source,/setCommunities\(\[\]\);setCommunityId\(null\);currentCommunityRef\.current=null/);
 assert.match(source,/setName\(''\);setEntryType\('INDIVIDUAL'\);setFormat\('LEAGUE'\)/);
 assert.match(source,/return \(\)=>\{generation\.current\+\+;\}/);
});
test('outdated community fetch cannot replace organizer communities',()=>{
 assert.match(source,/const load=useCallback\(async\(version=generation\.current\)=>/);
 assert.match(source,/if\(version!==generation\.current\)return/);
 assert.match(source,/if\(version===generation\.current\)setError/);
 assert.match(source,/if\(version===generation\.current\)setLoading\(false\)/);
});
test('user choice of community wins against suggested source community',()=>{
 assert.match(source,/communityOverridden\.current&&allowed\.some\(c=>c\.id===current\)\?current/);
 assert.match(source,/communityOverridden\.current=true;currentCommunityRef\.current=c\.id;setCommunityId\(c\.id\)/);
});
test('stale confirmation and duplicate saves cannot post a tournament',()=>{
 assert.match(source,/const version=generation\.current,identity=identityRef\.current,communityIdAtConfirmation=selected\.id/);
 assert.match(source,/savingRef\.current\|\|DEMO_MODE/);
 assert.match(source,/currentCommunityRef\.current!==communityIdAtConfirmation\)return/);
 assert.match(source,/savingRef\.current=true;setBusy\(true\)/);
 assert.match(source,/finally\{savingRef\.current=false;setBusy\(false\);\}/);
 assert.match(source,/void save\(payload,version,identity,communityIdAtConfirmation\)/);
});
test('late successful response cannot navigate to an old tournament context',()=>{
 assert.match(source,/const tournament=await createTournament\(/);
 assert.match(source,/if\(version!==generation\.current\|\|identity!==identityRef\.current\)return/);
 assert.match(source,/if\(version===generation\.current&&identity===identityRef\.current\)/);
});
