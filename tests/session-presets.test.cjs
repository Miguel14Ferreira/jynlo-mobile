'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const core=require('../src/lib/session-preset-core.cjs');
const empty={sport:'',day:'',time:'',city:'',address:'',latitude:null,longitude:null,locationConfirmed:false,maxParticipants:'10',price:'0',
 privateGame:false,password:'',meetingPointInstructions:'',externalConfirmedParticipants:'0',minParticipants:'2',registrationOpeningMode:'IMMEDIATE',
 communityId:null,registrationDay:'',registrationTime:'',recurrence:'NONE',recurrenceOccurrences:'4',venueId:null,seasonGame:false,additionalWeeklySlots:[],communityShareIds:[]};

test('saving a draft keeps the setup but never the date, time or password',()=>{
 const s=core.presetFromForm({...empty,sport:'Futsal',day:'2026-12-04',time:'21:00',password:'segredo',privateGame:true,city:'Lisboa',address:'Rua A',
  maxParticipants:'10',price:'3,5',externalConfirmedParticipants:'4',venueId:7,recurrence:'WEEKLY',recurrenceOccurrences:'8',
  additionalWeeklySlots:[{day:'2026-12-02',time:'20:00'}]},{hasExistingPlayers:true,locationMode:'saved',verifiedMapsLink:''});
 assert.equal(s.sport,'Futsal');assert.equal(s.creationMode,'COMPLETE');assert.equal(s.confirmedPlayers,5);
 assert.equal(s.hasPrice,true);assert.equal(s.priceAmount,3.5);assert.equal(s.selectedVenueId,7);assert.equal(s.locationMethod,'venue');
 assert.equal(s.weeklySessionsPerWeek,2);assert.equal(s.recurrenceOccurrences,8);assert.equal(s.privateGame,true);
 const json=JSON.stringify(s);assert.doesNotMatch(json,/segredo|2026-12-04|21:00/);
});

test('GPS positions are not saved; map-link points are',()=>{
 const gps=core.presetFromForm({...empty,sport:'Padel',latitude:38.7,longitude:-9.1},{hasExistingPlayers:false,locationMode:'gps',verifiedMapsLink:''});
 assert.equal(gps.latitude,null);assert.equal(gps.locationMethod,'gps');
 const link=core.presetFromForm({...empty,sport:'Padel',latitude:38.7,longitude:-9.1},{hasExistingPlayers:false,locationMode:'link',verifiedMapsLink:'https://maps.app.goo.gl/x'});
 assert.equal(link.latitude,38.7);assert.equal(link.venueMapLink,'https://maps.app.goo.gl/x');
});

test('validation matches the server',()=>{
 assert.throws(()=>core.presetFromForm(empty,{hasExistingPlayers:false,locationMode:'saved',verifiedMapsLink:''}),/modalidade/);
 assert.throws(()=>core.presetFromForm({...empty,sport:'Futsal',maxParticipants:'101'},{hasExistingPlayers:false,locationMode:'saved',verifiedMapsLink:''}),/2 e 100/);
 assert.throws(()=>core.validatePresetName('  '),/nome/);assert.throws(()=>core.validatePresetName('x'.repeat(71)),/70/);
});

test('applying a preset starts a fresh draft without date, time or password',()=>{
 const r=core.formFromPreset({...empty,day:'2026-01-01',password:'x'},{sport:'Futsal',city:'Lisboa',address:'Rua A',maxParticipants:12,creationMode:'COMPLETE',
  confirmedPlayers:5,hasPrice:true,priceAmount:3.5,privateGame:false,communityShareIds:[1,2],communityId:null,selectedVenueId:7,locationMethod:'venue',
  recurrence:'WEEKLY',recurrenceOccurrences:8,weeklySessionsPerWeek:2,registrationOpeningMode:'IMMEDIATE'},{sports:['Futsal'],communityIds:[1]});
 assert.equal(r.form.day,'');assert.equal(r.form.password,'');assert.equal(r.form.externalConfirmedParticipants,'4');
 assert.equal(r.form.price,'3,5');assert.deepEqual(r.form.communityShareIds,[1]);assert.equal(r.communityMode,'SHARED');
 assert.equal(r.venueId,7);assert.equal(r.hasExistingPlayers,true);
 assert.deepEqual(r.notes.sort(),['community','weeklySlots']);
 assert.equal(core.presetNotesText(r.notes).length,2);
});

test('a preset whose sport no longer exists is refused',()=>{
 assert.throws(()=>core.formFromPreset(empty,{sport:'Xadrez',maxParticipants:4},{sports:['Futsal'],communityIds:[]}),/já não está disponível/);
});

test('create screen loads, applies and saves presets through the shared endpoints',()=>{
 const api=read('src/lib/session-preset-api.ts');
 assert.match(api,/'\/api\/sessions\/presets',\{token\}/);
 assert.match(api,/method:'PUT'/);assert.match(api,/method:'DELETE'/);
 const screen=read('app/sessions/create.tsx');
 assert.match(screen,/Reutilizar uma configuração/);assert.match(screen,/Guardar novo perfil/);assert.match(screen,/Confirmar eliminação do perfil/);
});
