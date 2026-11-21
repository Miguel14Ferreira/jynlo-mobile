'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('organizer can report that a started session did not happen or had a problem',()=>{
 const api=read('src/lib/api.ts'),screen=read('app/sessions/[id].tsx');
 assert.match(api,/\/api\/sessions\/\$\{id\}\/problems`,\{token,method:'POST',body:\{type,details:note\|\|null\}\}/);
 assert.match(api,/if\(type==='OTHER'&&!note\)throw Error/);
 // Only the organizer, only after kick-off, only while open, only once.
 assert.match(screen,/owner&&detail&&!detail\.problemType&&\(detail\.status==='OPEN'\|\|detail\.status==='FULL'\)\s*&&Number\.isFinite\(Date\.parse\(detail\.gameDate\)\)&&Date\.parse\(detail\.gameDate\)<=Date\.now\(\)/);
 // Cancelling is irreversible, so it asks first.
 assert.match(screen,/Alert\.alert\('O jogo não aconteceu\?'/);
 assert.match(screen,/Problema já reportado: \{PROBLEM_LABELS\[detail\.problemType\]\}/);
});
