'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

for(const file of [
 'app/tournaments/[communityId]/[id]/fixtures.tsx',
 'app/tournaments/[communityId]/[id]/matches.tsx'
]){
 test(file+' ignores late matches from a different tournament',()=>{
  const source=read(file);
  assert.match(source,/generation=useRef\(0\),paging=useRef\(false\)/);
  assert.match(source,/const version=\+\+generation\.current/);
  assert.match(source,/return\(\)=>\{generation\.current\+\+;\}/);
  assert.match(source,/if\(version!==generation\.current\)return/);
  assert.match(source,/if\(version===generation\.current\)setError/);
  assert.match(source,/if\(version===generation\.current\)setLoading\(false\)/);
 });
 test(file+' locks pagination and never applies late pages',()=>{
  const source=read(file);
  assert.match(source,/paging\.current\|\|/);
  assert.match(source,/paging\.current=true/);
  assert.match(source,/if\(version!==generation\.current\)return/);
  assert.match(source,/paging\.current=false/);
  assert.match(source,/\.filter\(m=>!.*\.some\(x=>x\.id===m\.id\)\)/);
 });
}
test('team fixtures follow the backend page cursor, never guess it',()=>{
 const source=read('app/tournaments/[communityId]/[id]/fixtures.tsx');
 // The first page is now validated before use.
 assert.match(source,/const verified=validateFirstFixturePage<TournamentTeamMatch>\(matchData\)/);
 assert.match(source,/setPage\(verified\.page\)/);
 assert.match(source,/setPage\(part\.page\)/);
 assert.doesNotMatch(source,/setPage\(next\)/);
});

test('performance results cannot mix old and new tournament responses',()=>{
 const source=read('app/tournaments/[communityId]/[id]/results.tsx');
 assert.match(source,/generation=useRef\(0\)/);
 assert.match(source,/const version=\+\+generation\.current/);
 assert.match(source,/return\(\)=>\{generation\.current\+\+;\}/);
 assert.match(source,/if\(version!==generation\.current\)return/);
 assert.match(source,/if\(version===generation\.current\)setOverview\(result\)/);
 assert.match(source,/if\(version===generation\.current\)setLoading\(false\)/);
});

test('team profile match history uses server pagination cursor on initial and later pages',()=>{
 const source=read('app/tournaments/[communityId]/[id]/teams/[teamId].tsx');
 assert.match(source,/setMatches\(response\.matches\);setPage\(response\.page\);setHasMore\(response\.hasMore\)/);
 assert.match(source,/setPage\(part\.page\);setHasMore\(part\.hasMore\)/);
 assert.doesNotMatch(source,/setPage\(next\)/);
 assert.match(source,/paging\.current=false;\s*setLoadingMore\(false\)/);
});
