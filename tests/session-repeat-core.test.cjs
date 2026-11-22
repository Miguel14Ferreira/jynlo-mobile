const untranslate=require('./untranslate.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../src/lib/session-repeat-core.cjs');

test('next same weekday and time, at least an hour ahead',()=>{
 const original=new Date(2026,10,14,19,30).toISOString();
 assert.deepEqual(core.nextSameWeekday(original,new Date(2026,10,15,10,0)),{day:'2026-11-21',time:'19:30'});
 assert.deepEqual(core.nextSameWeekday(original,new Date(2026,10,21,19,0)),{day:'2026-11-28',time:'19:30'});
 assert.equal(core.nextSameWeekday('bad'),null);
});

test('copies sport, place, players and price, never password or players list',()=>{
 const detail={id:5,sport:'Padel',city:'Lisboa',address:'Rua A',gameDate:new Date(2026,10,14,19,30).toISOString(),pinLatitude:38.7,pinLongitude:-9.1,
  maxParticipants:4,minParticipants:4,priceAmount:6,meetingPointInstructions:'Campo 2',password:'x',participants:[1]};
 const patch=core.repeatFormPatch(detail,new Date(2026,10,15));
 assert.equal(patch.sport,'Padel');assert.equal(patch.day,'2026-11-21');assert.equal(patch.time,'19:30');
 assert.equal(patch.latitude,38.7);assert.equal(patch.locationConfirmed,true);
 assert.equal(patch.maxParticipants,'4');assert.equal(patch.price,'6');assert.equal(patch.meetingPointInstructions,'Campo 2');
 assert.equal('password' in patch,false);assert.equal('participants' in patch,false);
});

test('result message',()=>{
 assert.match(core.repeatInviteMessage({invited:3,skipped:1}),/3 jogadores da última vez foram convidados \(1 já estavam/);
 assert.match(core.repeatInviteMessage({invited:1,skipped:0}),/1 jogador da última vez foi convidado\.$/);
 assert.match(core.repeatInviteMessage({invited:0,skipped:0}),/Não havia jogadores/);
});

test('the organiser sees "Jogar outra vez" and creation invites the previous players',()=>{
 const read=f=>untranslate(fs.readFileSync(path.join(__dirname,'..',f),'utf8'));
 const detail=read('app/sessions/[id].tsx');
 assert.match(detail,/detail\.status==='COMPLETED'\?<View style=\{styles\.panel\}>/);
 assert.match(detail,/params:\{repeatFrom:String\(id\)/);
 const create=read('app/sessions/create.tsx');
 assert.match(create,/inviteFromPreviousSession\(result\.id,repeatFrom,actorToken\)/);
 assert.match(read('src/lib/api.ts'),/\/invites\/from-session\//);
});
