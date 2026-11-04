'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parseSessionDate,createSessionPayload}=require('../src/lib/session-create-core.cjs');
const sports=['Futebol','Padel','Karting'];
const valid={sport:'Padel',day:'2030-06-10',time:'18:30',city:'Lisboa',address:'Rua do Clube, 1',
 maxParticipants:'10',price:'3,50',privateGame:false,password:'',meetingPointInstructions:'Entrada principal'};
test('session creation: sends official API contract, defaults to immediate one-off public session',()=>{
 const payload=createSessionPayload(valid,sports,Date.parse('2030-01-01T00:00:00Z'));
 assert.equal(payload.sport,'Padel');assert.equal(payload.maxParticipants,10);
 assert.equal(payload.priceAmount,3.5);assert.equal(payload.recurrence,'NONE');
 assert.equal(payload.registrationOpeningMode,'IMMEDIATE');assert.equal(payload.privateGame,false);
 assert.equal(payload.communityId,null);assert.equal(payload.meetingPointInstructions,'Entrada principal');
 assert.match(payload.gameDate,/^2030-06-10T/);
});
test('session creation: private game requires password and never leaks password into public session',()=>{
 assert.throws(()=>createSessionPayload({...valid,privateGame:true,password:'abc'},sports,0));
 assert.equal(createSessionPayload({...valid,password:'secret'},sports,0).password,null);
 assert.equal(createSessionPayload({...valid,privateGame:true,password:'abcd'},sports,0).password,'abcd');
});
test('session creation: rejects fake sport, invalid cities, limits and prices',()=>{
 assert.throws(()=>createSessionPayload({...valid,sport:'Futebool'},sports,0));
 assert.throws(()=>createSessionPayload({...valid,city:'a'},sports,0));
 assert.throws(()=>createSessionPayload({...valid,maxParticipants:'1'},sports,0));
 assert.throws(()=>createSessionPayload({...valid,price:'-2'},sports,0));
 assert.throws(()=>createSessionPayload({...valid,meetingPointInstructions:'abc\ndef'},sports,0));
});
test('session creation: prevents invalid and past local datetimes',()=>{
 assert.throws(()=>parseSessionDate('2030-02-30','18:30',0));
 assert.throws(()=>parseSessionDate('2030-06-10','25:00',0));
 assert.throws(()=>parseSessionDate('2030-06-10','18:30',Date.parse('2030-07-10T00:00:00Z')));
});
