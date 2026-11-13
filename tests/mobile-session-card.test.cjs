'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {sessionCardStatus,participationProgress}=require('../src/lib/session-card-core.cjs');

const card=fs.readFileSync(path.join(__dirname,'../src/components/UI.tsx'),'utf8');
test('session availability reflects backend status and actual capacity',()=>{
 const base={status:'OPEN',maxParticipants:10,participantCount:3};
 assert.deepEqual(sessionCardStatus(base),{label:'7 vagas',tone:'available'});
 assert.deepEqual(sessionCardStatus({...base,participantCount:9}),{label:'1 vaga',tone:'available'});
 assert.deepEqual(sessionCardStatus({...base,participantCount:10}),{label:'Sem vagas',tone:'full'});
 assert.deepEqual(sessionCardStatus({...base,maxParticipants:null}),{label:'Vagas por confirmar',tone:'unavailable'});
 assert.deepEqual(sessionCardStatus({...base,participantCount:-1}),{label:'Vagas por confirmar',tone:'unavailable'});
 assert.deepEqual(sessionCardStatus({...base,maxParticipants:9.5}),{label:'Vagas por confirmar',tone:'unavailable'});
 assert.deepEqual(sessionCardStatus({...base,status:'CANCELLED'}),{label:'Cancelada',tone:'unavailable'});
 assert.deepEqual(sessionCardStatus({...base,privateGame:true}),{label:'Sessão privada',tone:'unavailable'});
 assert.deepEqual(sessionCardStatus({...base,audience:'COMMUNITY_ONLY'}),{label:'Só comunidade',tone:'unavailable'});
 assert.deepEqual(sessionCardStatus({...base,joinedByViewer:true}),{label:'Já vais!',tone:'joined'});
 assert.deepEqual(sessionCardStatus({...base,waitlistedByViewer:true}),{label:'Lista de espera',tone:'waiting'});
});
test('occupancy stays bounded even for incomplete server data',()=>{
 assert.equal(participationProgress({maxParticipants:10,participantCount:4}),.4);
 assert.equal(participationProgress({maxParticipants:10,participantCount:100}),1);
 assert.equal(participationProgress({maxParticipants:10,participantCount:-10}),0);
 assert.equal(participationProgress({maxParticipants:0,participantCount:4}),0);
 assert.equal(participationProgress({maxParticipants:null,participantCount:4}),0);
});
test('shared session card retains navigation and truthful presentation',()=>{
 assert.match(card,/export function SessionCard\(/);
 assert.match(card,/accessibilityRole="button"/);
 assert.match(card,/onPress=\{onPress\}/);
 assert.match(card,/sessionCardStatus\(session\)/);
 assert.match(card,/participationProgress\(session\)/);
 assert.match(card,/formatDate\(session\.gameDate\)/);
 assert.match(card,/money\(session\.priceAmount\)/);
 assert.match(card,/Number\.isFinite\(session\.maxParticipants\)/);
 assert.match(card,/Ver detalhes da sessão/);
});

test('past scheduled sessions cannot advertise open vacancies or attendance',()=>{
 const now=Date.parse('2026-11-13T20:00:00Z');
 const past={status:'OPEN',gameDate:'2026-11-12T20:00:00Z',maxParticipants:10,participantCount:3};
 const future={...past,gameDate:'2026-11-14T20:00:00Z'};
 assert.deepEqual(sessionCardStatus(past,now),{label:'Data ultrapassada',tone:'unavailable'});
 assert.deepEqual(sessionCardStatus({...past,joinedByViewer:true},now),{label:'Data ultrapassada',tone:'unavailable'});
 assert.deepEqual(sessionCardStatus(future,now),{label:'7 vagas',tone:'available'});
 assert.deepEqual(sessionCardStatus({...past,status:'CANCELLED'},now),{label:'Cancelada',tone:'unavailable'});
 assert.deepEqual(sessionCardStatus({...past,status:'COMPLETED'},now),{label:'Concluída',tone:'unavailable'});
});
