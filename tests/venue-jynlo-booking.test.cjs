'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const b=require('../src/lib/venue-jynlo-booking.cjs');
test('prices are read in euros and shown per language',()=>{
 assert.equal(b.parsePrice(''),null);
 assert.equal(b.parsePrice('24'),2400);
 assert.equal(b.parsePrice('24,5'),2450);
 assert.equal(b.parsePrice('24.50 €'),2450);
 assert.equal(b.parsePrice('abc'),undefined);
 assert.equal(b.formatPrice(2450,'pt'),'24,50 €');
 assert.equal(b.formatPrice(2450,'en'),'€24.50');
 assert.equal(b.formatPrice(null,'pt'),null);
 assert.equal(b.priceField(2400),'24');
 assert.equal(b.priceField(2450),'24,50');
});
test('times are shown in Lisbon time, also in summer',()=>{
 assert.equal(b.lisbonTime('2026-07-01T17:00:00Z'),'18:00');
 assert.equal(b.lisbonTime('2026-12-01T17:00:00Z'),'17:00');
 assert.equal(b.lisbonDateTime('2026-11-26T18:00:00Z'),'26/11, 18:00');
});
test('next days start today in Lisbon',()=>{
 const days=b.nextLisbonDays(3,new Date('2026-11-23T23:30:00Z'));
 assert.deepEqual(days,['2026-11-23','2026-11-24','2026-11-25']);
});
test('opening hours reject bad times, reversed ranges and overlaps',()=>{
 assert.equal(b.validateHours([{dayOfWeek:1,openTime:'09:00',closeTime:'12:00'},{dayOfWeek:1,openTime:'14:00',closeTime:'22:00'}]),null);
 assert.equal(b.validateHours([{dayOfWeek:1,openTime:'9h',closeTime:'12:00'}]),'format');
 assert.equal(b.validateHours([{dayOfWeek:1,openTime:'12:00',closeTime:'09:00'}]),'order');
 assert.equal(b.validateHours([{dayOfWeek:1,openTime:'09:00',closeTime:'12:00'},{dayOfWeek:1,openTime:'11:00',closeTime:'13:00'}]),'overlap');
});
test('only active future bookings can be cancelled',()=>{
 const now=new Date('2026-11-23T12:00:00Z');
 assert.equal(b.canCancel({status:'PENDING',startAt:'2026-11-24T10:00:00Z'},now),true);
 assert.equal(b.canCancel({status:'CONFIRMED',startAt:'2026-11-22T10:00:00Z'},now),false);
 assert.equal(b.canCancel({status:'DECLINED',startAt:'2026-11-24T10:00:00Z'},now),false);
});
test('booking alerts open "As minhas reservas"',()=>{
 const {notificationDestination}=require('../src/lib/notification-route.cjs');
 assert.deepEqual(notificationDestination({type:'VENUE_BOOKING',venueId:5}),{kind:'venue-bookings'});
});
