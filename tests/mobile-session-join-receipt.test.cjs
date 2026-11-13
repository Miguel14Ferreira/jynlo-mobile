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
