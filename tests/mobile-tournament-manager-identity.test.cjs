'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','app','tournaments','[communityId]','[id]','manage.tsx'),'utf8');

test('tournament organizer discards responses from an earlier competition',()=>{
 assert.match(source,/const generation=useRef\(0\)/);
 assert.match(source,/const version=\+\+generation\.current/);
 assert.match(source,/return \(\)=>\{generation\.current\+\+;\}/);
 assert.match(source,/if\(version!==generation\.current\)return/);
 assert.match(source,/if\(community\.id!==cid\)throw Error/);
 assert.match(source,/if\(version===generation\.current\)setLoading\(false\)/);
});
test('tournament organizer prevents duplicate writes and stale page updates',()=>{
 assert.match(source,/pendingWrite=useRef\(false\)/);
 assert.match(source,/if\(busy\|\|pendingWrite\.current\)return/);
 assert.match(source,/if\(version===generation\.current\)setNotice\(success\)/);
 assert.match(source,/if\(version!==generation\.current\)return;\s*setMatches\(previous/);
 assert.match(source,/pendingWrite\.current=false/);
});
test('tournament closure requires all loaded matches complete and no further pages',()=>{
 assert.match(source,/matches\.length>0&&!hasMore&&matches\.every\(m=>m\.status==='COMPLETED'\)/);
 assert.match(source,/disabled=\{busy\|\|!allVisibleFinished\}/);
});
