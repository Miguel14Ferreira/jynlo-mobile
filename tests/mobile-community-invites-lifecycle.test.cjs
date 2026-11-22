const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../app/communities/invites.tsx'),'utf8'));

test('invite inbox scopes async results to the focused identity',()=>{
 assert.match(source,/const generation=useRef\(0\)/);
 assert.match(source,/const version=\+\+generation\.current/);
 assert.match(source,/if\(version!==generation\.current\)return/);
 assert.match(source,/return \(\)=>\{generation\.current\+\+;responding\.current=false;\}/);
 assert.match(source,/setInvites\(\[\]\);setLoaded\(false\)/);
});
test('invite list distinguishes loading errors from empty inbox',()=>{
 assert.match(source,/const \[loaded,setLoaded\]=useState\(false\)/);
 assert.match(source,/!loading&&loaded&&!error&&auth\.token&&invites\.length===0/);
 assert.match(source,/title="Atualizar convites"/);
});
test('invitation actions cannot duplicate submissions and require explicit rejection',()=>{
 assert.match(source,/if\(responding\.current\|\|!auth\.token\|\|!auth\.username\)return/);
 assert.match(source,/responding\.current=true/);
 assert.match(source,/Alert\.alert\('Recusar convite'/);
 assert.match(source,/style:'destructive'/);
 assert.match(source,/setInvites\(current=>current\.filter\(invite=>invite\.id!==inviteId\)\)/);
 assert.match(source,/if\(version===generation\.current\)\{responding\.current=false;setBusyId\(null\);\}/);
});
