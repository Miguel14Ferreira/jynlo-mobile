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
 const payload=createSessionPayload({...valid,externalConfirmedParticipants:'4',minParticipants:'6',communityId:42,registrationOpeningMode:'MANUAL'},sports,0);
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

test('session creation: community required for manual and scheduled call-ups',()=>{
 assert.throws(()=>createSessionPayload({...valid,registrationOpeningMode:'MANUAL'},sports,0));
 const manual=createSessionPayload({...valid,communityId:42,registrationOpeningMode:'MANUAL'},sports,0);
 assert.equal(manual.communityId,42);assert.equal(manual.registrationOpensAt,null);
 const scheduled=createSessionPayload({...valid,communityId:42,registrationOpeningMode:'SCHEDULED',
  registrationDay:'2030-06-08',registrationTime:'11:00'},sports,0);
 assert.equal(scheduled.registrationOpeningMode,'SCHEDULED');
 assert.match(scheduled.registrationOpensAt,/^2030-06-08T/);
 assert.throws(()=>createSessionPayload({...valid,communityId:42,registrationOpeningMode:'SCHEDULED',
  registrationDay:'2030-06-11',registrationTime:'10:00'},sports,0));
});

test('session creation: weekly and biweekly only for communities with a valid timezone',()=>{
 const base={...valid,communityId:42,recurrenceOccurrences:'4',recurrenceTimeZone:'Europe/Lisbon'};
 const weekly=createSessionPayload({...base,recurrence:'WEEKLY'},sports,0);
 assert.equal(weekly.recurrence,'WEEKLY');assert.equal(weekly.recurrenceOccurrences,4);
 assert.equal(weekly.recurrenceTimeZone,'Europe/Lisbon');
 assert.deepEqual(weekly.additionalWeeklyGameDates,[]);
 const biweekly=createSessionPayload({...base,recurrence:'BIWEEKLY'},sports,0);
 assert.equal(biweekly.recurrence,'BIWEEKLY');
 assert.throws(()=>createSessionPayload({...base,communityId:null,recurrence:'WEEKLY'},sports,0));
 assert.throws(()=>createSessionPayload({...base,recurrence:'WEEKLY',recurrenceOccurrences:'53'},sports,0));
 assert.throws(()=>createSessionPayload({...base,recurrence:'WEEKLY',recurrenceTimeZone:'Fake/Zone'},sports,0));
});

test('session creation: optional verified venue ID is sent without inventing coordinates',()=>{
 const payload=createSessionPayload({...valid,venueId:3595},sports,0);
 assert.equal(payload.venueId,3595);
 assert.equal(payload.latitude,null);assert.equal(payload.longitude,null);
 assert.equal(createSessionPayload(valid,sports,0).venueId,null);
 assert.throws(()=>createSessionPayload({...valid,venueId:0},sports,0));
 assert.throws(()=>createSessionPayload({...valid,venueId:'unknown'},sports,0));
});

test('session creation: a season game belongs to exactly its selected community',()=>{
 const payload=createSessionPayload({...valid,communityId:42,seasonGame:true,communityRankingsEnabled:true},sports,0);
 assert.equal(payload.seasonCompetitionCommunityId,42);
 assert.equal(payload.confirmActivateRankings,false);
 assert.equal(createSessionPayload({...valid,communityId:42},sports,0).seasonCompetitionCommunityId,null);
 assert.throws(()=>createSessionPayload({...valid,seasonGame:true,communityRankingsEnabled:true},sports,0));
});
test('session creation: consent is mandatory when rankings are disabled',()=>{
 const base={...valid,communityId:42,seasonGame:true,communityRankingsEnabled:false};
 assert.throws(()=>createSessionPayload(base,sports,0));
 const payload=createSessionPayload({...base,confirmActivateRankings:true},sports,0);
 assert.equal(payload.confirmActivateRankings,true);
 assert.equal(payload.seasonCompetitionCommunityId,42);
 assert.throws(()=>createSessionPayload({...valid,confirmActivateRankings:true},sports,0));
});

test('session creation: multiple weekly slots sorted, unique and limited to seven per cycle',()=>{
 const weekly={...valid,communityId:42,recurrence:'WEEKLY',recurrenceOccurrences:'4',recurrenceTimeZone:'Europe/Lisbon'};
 const payload=createSessionPayload({...weekly,additionalWeeklySlots:[
  {day:'2030-06-12',time:'19:00'},{day:'2030-06-11',time:'17:00'}
 ]},sports,0);
 assert.equal(payload.additionalWeeklyGameDates.length,2);
 assert.equal(payload.additionalWeeklyGameDates[0].slice(0,10),'2030-06-11');
 assert.equal(payload.additionalWeeklyGameDates[1].slice(0,10),'2030-06-12');
 assert.equal(payload.recurrenceOccurrences*(payload.additionalWeeklyGameDates.length+1),12);
 assert.throws(()=>createSessionPayload({...weekly,additionalWeeklySlots:[{day:'2030-06-10',time:'18:30'}]},sports,0));
 assert.throws(()=>createSessionPayload({...weekly,additionalWeeklySlots:[{day:'2030-06-18',time:'18:30'}]},sports,0));
 assert.throws(()=>createSessionPayload({...weekly,additionalWeeklySlots:[{day:'2030-06-11',time:'17:00'},{day:'2030-06-11',time:'17:00'}]},sports,0));
 assert.throws(()=>createSessionPayload({...weekly,recurrenceOccurrences:'27',additionalWeeklySlots:[{day:'2030-06-12',time:'19:00'}]},sports,0));
 assert.throws(()=>createSessionPayload({...weekly,recurrence:'BIWEEKLY',additionalWeeklySlots:[{day:'2030-06-12',time:'19:00'}]},sports,0));
});

test('session creation: multi-community shares use backend member-only contract',()=>{
 const shared=createSessionPayload({...valid,communityShareIds:[12,25,47],
  recurrence:'WEEKLY',recurrenceOccurrences:'3',recurrenceTimeZone:'Europe/Lisbon',
  registrationOpeningMode:'MANUAL'},sports,0);
 assert.equal(shared.communityId,null);
 assert.deepEqual(shared.communityShareIds,[12,25,47]);
 assert.equal(shared.privateGame,false);
 assert.equal(shared.registrationOpeningMode,'MANUAL');
 assert.equal(shared.recurrence,'WEEKLY');
 assert.equal(shared.seasonCompetitionCommunityId,null);
});
test('session creation: shared sessions prevent passwords, mixed community modes and season games',()=>{
 assert.throws(()=>createSessionPayload({...valid,communityId:12,communityShareIds:[25]},sports,0));
 assert.throws(()=>createSessionPayload({...valid,communityShareIds:[12,12]},sports,0));
 assert.throws(()=>createSessionPayload({...valid,communityShareIds:[1,2,3,4,5,6]},sports,0));
 assert.throws(()=>createSessionPayload({...valid,communityShareIds:[2],privateGame:true,password:'secret'},sports,0));
 assert.throws(()=>createSessionPayload({...valid,communityShareIds:[2],seasonGame:true,communityRankingsEnabled:true},sports,0));
 assert.throws(()=>createSessionPayload({...valid,communityShareIds:[0]},sports,0));
});

test('session creation: rejects malformed shared groups rather than silently creating a public session',()=>{
 for(const groups of ['12,25',{id:12},[12,'25'],[null],[-2],[2,2]]){
  assert.throws(()=>createSessionPayload({...valid,communityShareIds:groups},sports,0));
 }
});
test('session creation: rejects malformed weekly slots rather than silently dropping them',()=>{
 const weekly={...valid,communityId:42,recurrence:'WEEKLY',recurrenceOccurrences:'3',recurrenceTimeZone:'Europe/Lisbon'};
 for(const slots of ['2030-06-12',{},[null],[{day:'2030-06-12'}],[{day:2030,time:'19:00'}]]){
  assert.throws(()=>createSessionPayload({...weekly,additionalWeeklySlots:slots},sports,0));
 }
});

test('session creation: adding a weekly slot only validates the schedule, not unrelated form fields',()=>{
 const {validateWeeklySlots}=require('../src/lib/session-create-core.cjs');
 const slots=validateWeeklySlots('2030-06-10','18:30',[{day:'2030-06-12',time:'19:00'}],'WEEKLY',4,0);
 assert.equal(slots.length,1);
 assert.match(slots[0],/^2030-06-12T/);
 assert.throws(()=>validateWeeklySlots('2030-06-10','18:30',[{day:'2030-06-10',time:'18:30'}],'WEEKLY',4,0));
 assert.throws(()=>validateWeeklySlots('2030-06-10','18:30',[{day:'2030-06-12',time:'19:00'}],'WEEKLY',52,0));
 assert.throws(()=>validateWeeklySlots('2030-06-10','18:30',[{day:'2030-06-12',time:'19:00'}],'BIWEEKLY',4,0));
});

test('session creation: switching community type clears incompatible recurring and registration state',()=>{
 const {changeCommunityMode}=require('../src/lib/session-create-core.cjs');
 const previous={...valid,communityId:42,registrationOpeningMode:'SCHEDULED',
  registrationDay:'2030-06-01',registrationTime:'15:00',
  recurrence:'WEEKLY',recurrenceOccurrences:'4',additionalWeeklySlots:[{day:'2030-06-12',time:'19:00'}],
  seasonGame:true,communityRankingsEnabled:true,confirmActivateRankings:true,privateGame:true,password:'secret'};
 for(const mode of ['INDEPENDENT','SINGLE','SHARED']){
  const next=changeCommunityMode(previous,mode);
  assert.equal(next.communityId,null);
  assert.deepEqual(next.communityShareIds,[]);
  assert.equal(next.registrationOpeningMode,'IMMEDIATE');
  assert.equal(next.registrationDay,'');assert.equal(next.registrationTime,'');
  assert.equal(next.recurrence,'NONE');assert.deepEqual(next.additionalWeeklySlots,[]);
  assert.equal(next.seasonGame,false);assert.equal(next.confirmActivateRankings,false);
  assert.equal(next.sport,'Padel');
  assert.equal(next.privateGame,mode!=='SHARED');
  if(mode==='SHARED')assert.equal(next.password,'');
 }
 assert.equal(previous.communityId,42);
 assert.throws(()=>changeCommunityMode(previous,'INVALID'));
});

test('session creation: Android numeric date entry formats and limits input safely',()=>{
 const {formatLocalDateInput,formatLocalTimeInput}=require('../src/lib/session-create-core.cjs');
 assert.equal(formatLocalDateInput('20300610'),'2030-06-10');
 assert.equal(formatLocalDateInput('2030-06-10'),'2030-06-10');
 assert.equal(formatLocalDateInput('2030'),'2030');
 assert.equal(formatLocalDateInput('203006'),'2030-06');
 assert.equal(formatLocalDateInput('2030061099'),'2030-06-10');
 assert.equal(formatLocalTimeInput('1930'),'19:30');
 assert.equal(formatLocalTimeInput('19:30'),'19:30');
 assert.equal(formatLocalTimeInput('19'),'19');
 assert.equal(formatLocalTimeInput('193055'),'19:30');
 assert.throws(()=>parseSessionDate(formatLocalDateInput('20300230'),formatLocalTimeInput('1830'),0));
});

test('session confirmation: public and community visibility reflect the submitted payload',()=>{
 const {describeSessionConfirmation}=require('../src/lib/session-create-core.cjs');
 const publicPayload=createSessionPayload(valid,sports,0);
 const publicText=describeSessionConfirmation(publicPayload);
 assert.match(publicText,/Pública/);
 assert.doesNotMatch(publicText,/palavra-passe/);
 const groupPayload=createSessionPayload({...valid,communityId:12},sports,0);
 const groupText=describeSessionConfirmation(groupPayload,{communityName:'Equipa A'});
 assert.match(groupText,/Apenas membros da comunidade/);
 assert.match(groupText,/Comunidade Equipa A/);
 assert.doesNotMatch(groupText,/Pública/);
 const privatePayload=createSessionPayload({...valid,privateGame:true,password:'supersecret'},sports,0);
 const privateText=describeSessionConfirmation(privatePayload);
 assert.match(privateText,/Privada com palavra-passe/);
 assert.doesNotMatch(privateText,/supersecret/);
 const sharePayload=createSessionPayload({...valid,communityShareIds:[12,13]},sports,0);
 const shareText=describeSessionConfirmation(sharePayload,{sharedCommunityNames:['Grupo A','Grupo B']});
 assert.match(shareText,/Apenas membros das comunidades/);
 assert.match(shareText,/Grupo A, Grupo B/);
 assert.doesNotMatch(shareText,/Pública/);
});

test('session confirmation: UTC API dates display in the device local timezone',()=>{
 const {formatSessionLocalDateTime,describeSessionConfirmation}=require('../src/lib/session-create-core.cjs');
 const payload=createSessionPayload(valid,sports,0);
 const date=new Date(payload.gameDate);
 const pad=n=>String(n).padStart(2,'0');
 const expected=date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate())+
  ' '+pad(date.getHours())+':'+pad(date.getMinutes());
 assert.equal(formatSessionLocalDateTime(payload.gameDate),expected);
 assert.ok(describeSessionConfirmation(payload).includes(expected));
 assert.throws(()=>formatSessionLocalDateTime('not-a-date'));
});
