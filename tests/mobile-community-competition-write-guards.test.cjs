'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=relative=>fs.readFileSync(path.join(__dirname,'..',relative),'utf8');

test('championship and team screens synchronously prevent rapid duplicate writes',()=>{
 for(const file of [
  'app/communities/[id]/championships/[championshipId].tsx',
  'app/communities/[id]/championships/teams.tsx'
 ]){
  const source=read(file);
  assert.match(source,/import React,\{useCallback,useRef,useState\}/);
  assert.match(source,/const savingRef=useRef\(false\)/);
  assert.match(source,/if\(savingRef\.current\|\|saving/);
  assert.match(source,/savingRef\.current=true;setSaving\(true\)/);
  assert.match(source,/finally\{savingRef\.current=false;setSaving\(false\);\}/);
  assert.match(source,/Confirma o estado antes de repetir/);
 }
});
test('championship updates require a loaded and open championship',()=>{
 const source=read('app/communities/[id]/championships/[championshipId].tsx');
 assert.match(source,/!organizer\|\|!championship\|\|championship\.closedAt/);
 assert.match(source,/setRetry\(n=>n\+1\)/);
});
test('team updates require data and organizer permissions',()=>{
 const source=read('app/communities/[id]/championships/teams.tsx');
 assert.match(source,/closed\|\|!organizer\|\|!auth\.token\|\|!data/);
 assert.match(source,/setData\(next\)/);
});
test('tournament manager ignores stale responses after navigation',()=>{
 const source=read('app/tournaments/[communityId]/[id]/manage.tsx');
 assert.match(source,/const generation=useRef\(0\)/);
 assert.match(source,/return \(\)=>\{generation\.current\+\+;\}/);
 assert.match(source,/if\(version!==generation\.current\)return/);
});
