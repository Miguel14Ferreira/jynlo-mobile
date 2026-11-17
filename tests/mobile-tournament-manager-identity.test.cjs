'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','app','tournaments','[communityId]','[id]','manage.tsx'),'utf8');

test('tournament organizer discards responses from an earlier competition',()=>{
 assert.match(source,/const generation=useRef\(0\),readVersion=useRef\(0\)/);
 assert.match(source,/const version=\+\+generation\.current/);
 assert.match(source,/return \(\)=>\{generation\.current\+\+;readVersion\.current\+\+;\}/);
 assert.match(source,/if\(version!==generation\.current\|\|request!==readVersion\.current\)return false/);
 assert.match(source,/if\(community\.id!==cid\)throw Error/);
 assert.match(source,/version===generation\.current&&request===readVersion\.current/);
});

test('tournament organizer prevents duplicate writes and stale page updates',()=>{
 assert.match(source,/pendingWrite=useRef\(false\)/);
 assert.match(source,/busy\|\|syncing\|\|loading\|\|pendingWrite\.current/);
 assert.match(source,/if\(version!==generation\.current\)return/);
 assert.match(source,/pendingWrite\.current=true/);
 assert.match(source,/validateNextFixturePage<TournamentTeamMatch\|TournamentIndividualMatch>\(response,next\)/);
 assert.match(source,/reading!==readVersion\.current\)return/);
 assert.match(source,/pendingWrite\.current=false/);
});

test('tournament closure requires all loaded matches complete and no further pages',()=>{
 assert.match(source,/fixturesVerified&&matches\.length>0&&!hasMore&&matches\.every\(m=>m\.status==='COMPLETED'\)/);
 assert.match(source,/disabled=\{busy\|\|syncing\|\|!allVisibleFinished\}/);
 assert.match(source,/canCompleteTournament\(role,tournament\)/);
 assert.match(source,/O backend valida a classificação e o campeão antes de fechar/);
});
