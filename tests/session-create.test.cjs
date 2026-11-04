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
 assert.equal(payload.externalConfirmedParticipants,0);assert.equal(payload.minParticipants,2);
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

test('session creation: existing players and manual opening use backend fields',()=>{
 const payload=createSessionPayload({...valid,externalConfirmedParticipants:'4',minParticipants:'6',registrationOpeningMode:'MANUAL'},sports,0);
 assert.equal(payload.externalConfirmedParticipants,4);
 assert.equal(payload.minParticipants,6);
 assert.equal(payload.registrationOpeningMode,'MANUAL');
 assert.equal(payload.registrationOpensAt,null);
});
test('session creation: cannot overbook participants or use unsupported registration opening',()=>{
 assert.throws(()=>createSessionPayload({...valid,maxParticipants:'5',externalConfirmedParticipants:'5'},sports,0));
 assert.throws(()=>createSessionPayload({...valid,minParticipants:'11'},sports,0));
 assert.throws(()=>createSessionPayload({...valid,registrationOpeningMode:'SCHEDULED'},sports,0));
});
