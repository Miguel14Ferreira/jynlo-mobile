'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {guestReceiptStatusCategory}=require('../src/lib/guest-receipt-status.cjs');
test('recognized confirmed and pending receipts resolve to active',()=>{
 for(const status of ['APPROVED','LINKED','PENDING'])
  assert.equal(guestReceiptStatusCategory(status),'active');
});
test('cancelled or rejected receipts resolve to closed',()=>{
 for(const status of ['CANCELLED','REJECTED'])
  assert.equal(guestReceiptStatusCategory(status),'closed');
});
test('unknown or malformed server responses never permit a new RSVP',()=>{
 for(const status of [undefined,null,'','ERROR','CONFIRMED','approved',{},0])
  assert.equal(guestReceiptStatusCategory(status),'unknown');
});
