const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('confirmed enrollment notifies the owning competition only after server acknowledgement',()=>{
 const enrollment=read('src/components/GlobalTeamEnrollment.tsx');
 assert.match(enrollment,/onEnrolled\?:\(\)=>void/);
 assert.match(enrollment,/const next=await finalizeGlobalTeamEntry\(/);
 const confirmed=enrollment.indexOf("setEntry(next);setEntryCheck('present')");
 const notify=enrollment.indexOf('onEnrolled?.()');
 assert.ok(confirmed>=0&&notify>confirmed,'callback must follow confirmed enrollment');
 assert.ok(notify<enrollment.indexOf('}catch(e)',confirmed),'never notify after a failed enrollment');
 assert.match(enrollment,/if\(version!==generation\.current\)return/);
});

test('both invitation and application enrollment surfaces propagate the completion event',()=>{
 for(const filename of ['src/components/CompetitionTeamSearch.tsx',
  'src/components/TeamCompetitionApplications.tsx']){
  const source=read(filename);
  assert.match(source,/onEnrolled\?:\(\)=>void/);
  assert.match(source,/onEnrolled=\{onEnrolled\}/);
 }
});

test('tournament enrollment refreshes parent list without interrupting the current view',()=>{
 const source=read('app/tournaments/[communityId]/[id]/teams.tsx');
 assert.match(source,/const load=useCallback\(async\(version=generation\.current,silent=false\)=>/);
 assert.match(source,/if\(!silent\)setLoading\(true\)/);
 assert.match(source,/if\(version===generation\.current&&!silent\)setLoading\(false\)/);
 const wired=source.match(/onEnrolled=\{\(\)=>\{void load\(generation\.current,true\);\}\}/g)||[];
 assert.equal(wired.length,2,'both enrollment paths refresh the tournament');
});

test('championship enrollment reloads season links and ignores stale write results',()=>{
 const source=read('app/communities/[id]/championships/teams.tsx');
 const wired=source.match(/onEnrolled=\{\(\)=>setRetry\(x=>x\+1\)\}/g)||[];
 assert.equal(wired.length,2,'both enrollment paths refresh season teams');
 assert.match(source,/const version=\+\+viewGeneration\.current/);
 assert.match(source,/if\(version!==viewGeneration\.current\)return/);
 assert.match(source,/if\(version===viewGeneration\.current\)setError/);
 assert.match(source,/savingRef\.current=false;\s*setSaving\(false\)/);
});
