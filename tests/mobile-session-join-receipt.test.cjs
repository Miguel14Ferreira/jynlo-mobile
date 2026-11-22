const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {confirmedSessionJoin:receipt}=require('../src/lib/session-join-receipt.cjs');
test('session participant receipt requires explicit confirmation',()=>{
 assert.equal(receipt(null),null);
 assert.equal(receipt({}),null);
 assert.equal(receipt({state:'UNKNOWN'}),null);
 assert.equal(receipt({state:'PARTICIPANT'}).state,'PARTICIPANT');
 assert.match(receipt({state:'PARTICIPANT'}).message,/confirmada/);
});
test('waitlist acknowledgement validates position without inventing one',()=>{
 assert.match(receipt({state:'WAITLISTED',waitlistPosition:3}).message,/posição 3/);
 assert.match(receipt({state:'WAITLISTED',waitlistPosition:null}).message,/lista de espera/);
 assert.equal(receipt({state:'WAITLISTED',waitlistPosition:0}),null);
 assert.equal(receipt({state:'WAITLISTED',waitlistPosition:-1}),null);
 assert.equal(receipt({state:'WAITLISTED',waitlistPosition:'1'}),null);
});

test('shared join API refuses malformed and unconfirmed server participation states',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const api=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/api.ts'),'utf8'));
 const source=api.slice(api.indexOf('export async function joinSession('),api.indexOf('export async function leaveSession('));
 assert.match(source,/if\(!Number\.isSafeInteger\(id\)\|\|id<=0\|\|!token\)/);
 assert.match(source,/if\(!confirmedSessionJoin\(result\)\)/);
 assert.match(source,/não confirmou a participação/);
});
