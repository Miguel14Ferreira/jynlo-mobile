'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/communities/[id]/championships/teams.tsx'),'utf8');
test('unavailable team association buttons explain the exact prerequisite',()=>{
 assert.match(source,/disabled=\{saving\|\|!picked\|\|picked===entry\.championshipTeamId\|\|conflictingTeamIds\.has\(picked\)\}/);
 assert.match(source,/Cria primeiro uma equipa da época/);
 assert.match(source,/Esta equipa já está associada/);
 assert.match(source,/Esta equipa já está utilizada nesta prova/);
});
