'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {editSessionPayload,toDateTime}=require('../src/lib/session-details-edit-core.cjs');
const source=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const future=new Date(Date.now()+86400000*10);
const date=[future.getFullYear(),String(future.getMonth()+1).padStart(2,'0'),String(future.getDate()).padStart(2,'0')].join('-');
const input=()=>({sport:'Padel',date,hour:'20:00',city:'Lisboa',address:'Rua do Desporto 12',
 maxParticipants:'10',minParticipants:'6',priceAmount:'3,50',meetingPointInstructions:'Porta principal',description:'Jogo amigável'});
test('session detail edits match web backend PATCH fields',()=>{
 const payload=editSessionPayload(input(),['Padel','Futebol']);
 assert.equal(payload.priceAmount,3.5);
 assert.equal(payload.maxParticipants,10);
 assert.equal(payload.minParticipants,6);
 assert.deepEqual(Object.keys(payload).sort(),
  ['sport','gameDate','maxParticipants','minParticipants','priceAmount','city','address','meetingPointInstructions','description'].sort());
});
test('reject capacity below the minimum, invalid sports and bad dates',()=>{
 assert.throws(()=>editSessionPayload({...input(),maxParticipants:'5'},['Padel']),/Mínimo/);
 assert.throws(()=>editSessionPayload({...input(),sport:'Outra'},['Padel']),/modalidade/);
 assert.throws(()=>toDateTime('2026-02-30','19:00'),/não existem/);
 assert.throws(()=>editSessionPayload({...input(),hour:'25:00'},['Padel']),/data e hora/);
});
test('reject an expired session date, invalid price and control characters',()=>{
 assert.throws(()=>editSessionPayload(input(),['Padel'],Date.now()+86400000*40),/futuras/);
 assert.throws(()=>editSessionPayload({...input(),priceAmount:'-1'},['Padel']),/preço/);
 assert.throws(()=>editSessionPayload({...input(),meetingPointInstructions:'linha\nseguinte'},['Padel']),/ponto de encontro/);
});
test('only the authenticated organizer can open the edit route',()=>{
 const edit=source('app/sessions/[id]/edit.tsx');
 const api=source('src/lib/session-details-edit-api.ts');
 const detail=source('app/sessions/[id].tsx');
 const layout=source('app/_layout.tsx');
 assert.match(edit,/isOrganizer\(result,auth\.username\)/);
 assert.match(edit,/saving\.current/);
 assert.match(api,/method:'PATCH'/);
 assert.match(api,/\/details/);
 assert.match(detail,/pathname:'\/sessions\/\[id\]\/edit'/);
 assert.match(layout,/name="sessions\/\[id\]\/edit"/);
});

test('editor honors creation capacity and address limits',()=>{
 assert.throws(()=>editSessionPayload({...input(),maxParticipants:'101'},['Padel']),/Máximo/);
 assert.equal(editSessionPayload({...input(),address:'A'.repeat(500)},['Padel']).address.length,500);
 assert.throws(()=>editSessionPayload({...input(),address:'A'.repeat(501)},['Padel']),/morada/);
});
test('capacity cannot displace existing participants or externally confirmed players',()=>{
 assert.throws(()=>editSessionPayload({...input(),maxParticipants:'9',currentParticipantCount:10},['Padel']),/inscritos/);
 assert.throws(()=>editSessionPayload({...input(),maxParticipants:'9',currentExternalConfirmedParticipants:9},['Padel']),/externos/);
 assert.equal(editSessionPayload({...input(),currentParticipantCount:8,currentExternalConfirmedParticipants:5},['Padel']).maxParticipants,10);
});

test('edit form reuses stable local date/time input formatters',()=>{
 const edit=source('app/sessions/[id]/edit.tsx');
 assert.match(edit,/formatLocalDateInput\(value\)/);
 assert.match(edit,/formatLocalTimeInput\(value\)/);
 assert.match(edit,/currentParticipantCount:session\.participantCount/);
 assert.match(edit,/currentExternalConfirmedParticipants:session\.externalConfirmedParticipants/);
});

test('mobile editing supports the server description field without corrupting existing text',()=>{
 const payload=editSessionPayload({...input(),description:'  Regras: levar colete  '},['Padel']);
 assert.equal(payload.description,'Regras: levar colete');
 assert.equal(editSessionPayload({...input(),description:''},['Padel']).description,'');
 assert.throws(()=>editSessionPayload({...input(),description:'a'.repeat(1001)},['Padel']),/descrição/);
 assert.throws(()=>editSessionPayload({...input(),description:'abc\\u0000def'},['Padel']),/descrição/);
 const ui=source('app/sessions/[id]/edit.tsx');
 assert.match(ui,/Descrição da sessão \(opcional\)/);
 assert.match(ui,/value=\{draft\.description\}/);
 assert.match(ui,/maxLength=\{1000\}/);
 assert.match(source('src/lib/session-details-edit-api.ts'),/description:string/);
});
