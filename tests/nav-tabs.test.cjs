'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const n=require('../src/lib/nav-tabs.cjs');
test('bottom bar starts with Explorar and Mensagens',()=>{
 assert.deepEqual(n.resolveNavTabs(null,false),['explore','messages']);
});
test('saved choices are kept, invalid or repeated ones dropped, gaps filled',()=>{
 assert.deepEqual(n.resolveNavTabs(['teams','teams','nope'],false),['teams','explore']);
 assert.deepEqual(n.resolveNavTabs(['my-venues'],false),['explore','messages']);
 assert.deepEqual(n.resolveNavTabs(['my-venues','communities'],true),['my-venues','communities']);
});
test('picking a section already in the other slot swaps them',()=>{
 assert.deepEqual(n.setNavSlot(['explore','messages'],0,'messages'),['messages','explore']);
 assert.deepEqual(n.setNavSlot(['explore','messages'],1,'teams'),['explore','teams']);
});
test('As minhas reservas only once venues take bookings',()=>{
 assert.ok(!n.availableNavTabs(false).some(tab=>tab.id==='my-bookings'));
 assert.ok(n.availableNavTabs(false,true).some(tab=>tab.id==='my-bookings'));
 assert.deepEqual(n.resolveNavTabs(['my-bookings'],false),['explore','messages']);
});
