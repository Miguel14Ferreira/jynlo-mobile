'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {venueBookingAction,safeBookingUrl}=require('../src/lib/venue-booking.cjs');
test('booking link wins, then website',()=>{
  assert.deepEqual(venueBookingAction({bookingUrl:'playtomic.com/clubs/x',website:'https://c.pt'}),{kind:'link',url:'https://playtomic.com/clubs/x'});
  assert.deepEqual(venueBookingAction({website:'https://c.pt/r'}),{kind:'link',url:'https://c.pt/r'});
});
test('phone with WhatsApp only for mobiles',()=>{
  assert.deepEqual(venueBookingAction({contact:'912 345 678'}),{kind:'phone',url:'tel:+351912345678',whatsapp:'https://wa.me/351912345678'});
  assert.equal(venueBookingAction({contact:'213456789'}).whatsapp,null);
});
test('free access and search fallback',()=>{
  assert.deepEqual(venueBookingAction({freeAccess:true,bookingUrl:'https://x.pt'}),{kind:'free'});
  assert.match(venueBookingAction({name:'Campo A',city:'Porto'}).url,/Campo%20A%20Porto%20reservar/);
});
test('unsafe links are ignored',()=>{
  assert.equal(safeBookingUrl('javascript:alert(1)'),null);
  assert.equal(safeBookingUrl('http://c.pt'),null);
});
