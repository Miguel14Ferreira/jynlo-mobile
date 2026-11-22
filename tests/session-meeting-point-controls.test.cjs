const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/api.ts'),'utf8'));
const fn=source.slice(source.indexOf('export async function updateSessionMeetingPoint('),
                      source.indexOf('export async function updateSessionExternalConfirmations('));
test('meeting point rejects control characters without rejecting ordinary Portuguese text',()=>{
 assert.ok(fn.startsWith('export async function updateSessionMeetingPoint('));
 const match=fn.match(/instructions\.length>240\|\|((?:\/(?:\\.|[^/\n])+\/))\.test\(instructions\)/);
 assert.ok(match,'expected length and control-character guard');
 const expression=match[1];
 const regex=vm.runInNewContext(expression);
 for(const valid of ['Treino no recinto','Encontrar na entrada','Ponto de encontro']){
   assert.equal(regex.test(valid),false,valid);
 }
 for(const invalid of ['linha\nseguinte','linha\rseguinte','abc\tdef','abc\x00def','abc\x7fdef']){
   assert.equal(regex.test(invalid),true,JSON.stringify(invalid));
 }
 assert.match(fn,/instructions\.length>240/);
});
