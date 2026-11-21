'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/tournaments/[communityId]/[id].tsx'),'utf8');

test('focus changes invalidate tournament details and ranking responses',()=>{
 assert.match(source,/const generation=useRef\(0\)/);
 assert.match(source,/const load=useCallback\(async\(version=generation\.current\)=>/);
 assert.match(source,/const version=\+\+generation\.current/);
 assert.match(source,/return \(\)=>\{generation\.current\+\+;\}/);
 assert.match(source,/if\(version!==generation\.current\)return/);
 // Each explicit reload also carries its own request token.
 assert.match(source,/if\(version===generation\.current&&request===requestVersion\.current\)setTable\(standings\)/);
});
test('previous tournament, account and organizer controls are cleared when opening another',()=>{
 assert.match(source,/setTournament\(null\);setOrganizerRole\(null\);setTable\(null\);setTableError\(''\);setError\(''\);setLoading\(true\)/);
 assert.match(source,/if\(version===generation\.current(&&request===requestVersion\.current)?\)setLoading\(false\)/);
 assert.match(source,/if\(version===generation\.current(&&request===requestVersion\.current)?\)setError\(/);
});
test('details are limited to valid tournament and member community',()=>{
 assert.match(source,/Number\.isSafeInteger\(communityId\)/);
 assert.match(source,/Number\.isSafeInteger\(id\)/);
 assert.match(source,/community\.id!==communityId/);
 assert.match(source,/!\('myRole' in community\)\|\|!community\.myRole/);
 assert.match(source,/setOrganizerRole\(community\.myRole\)/);
});
test('standings use returned backend values without football fallback for performance sports',()=>{
 assert.match(source,/tournamentTable\(communityId,result,auth\.token,auth\.username\)/);
 assert.match(source,/classificationKind\(tournament\)/);
 assert.match(source,/isPerformanceKind\(kind\)/);
 assert.match(source,/r\.won\?\?'—'/);
 assert.match(source,/r\.drawn\?\?'—'/);
 assert.match(source,/r\.lost\?\?'—'/);
});
