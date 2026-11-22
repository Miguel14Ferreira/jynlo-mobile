const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=f=>untranslate(fs.readFileSync(path.join(__dirname,'..',f),'utf8'));
const fx=require('../src/lib/future-exclusion.cjs');
test('"Falta registada" is only offered after a recorded no-show (server rule)',()=>{
 assert.equal(fx.reasonsFor('ATTENDED').some(r=>r.id==='NO_SHOW'),false);
 assert.equal(fx.reasonsFor('NO_SHOW')[0].id,'NO_SHOW');
 assert.equal(fx.reasonsFor(null).length,4);
});
test('only the organizer manages it, never for themselves',()=>{
 assert.equal(fx.canManage('Miguel','miguel','ana'),true);
 assert.equal(fx.canManage('ana','miguel','rui'),false);
 assert.equal(fx.canManage('miguel','miguel','Miguel'),false);
});
test('the roster opens the sheet, which uses the server endpoints',()=>{
 const sheet=read('src/components/FutureExclusionSheet.tsx');
 assert.match(sheet,/\/api\/sessions\/\$\{sessionId\}\/participants\/\$\{participantId\}\/future-exclusion/);
 assert.match(sheet,/\{token,method:'PUT',body:\{reason\}\}:\{token,method:'DELETE'\}/);
 assert.match(sheet,/Impedir futuras inscrições/);assert.match(sheet,/Voltar a permitir/);
 const screen=read('app/sessions/[id].tsx');
 assert.match(screen,/canManageFutureExclusion\(auth\.username,detail\.creatorUsername,p\.username\)/);
 assert.match(screen,/<FutureExclusionSheet sessionId=\{id\} participant=\{exclusionFor\}/);
});
