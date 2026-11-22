const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('organizer update APIs use authenticated PATCH without retries',()=>{
 const api=read('src/lib/api.ts');
 assert.match(api,/method\?:'GET'\|'POST'\|'PUT'\|'PATCH'\|'DELETE'/);
 assert.match(api,/export async function updateSessionMeetingPoint/);
 assert.match(api,/export async function updateSessionExternalConfirmations/);
 assert.match(api,/\/api\/sessions\/\$\{id\}\/meeting-point/);
 assert.match(api,/\/api\/sessions\/\$\{id\}\/external-confirmations/);
 assert.match(api,/method:'PATCH'/);
 assert.match(api,/meetingPointInstructions:instructions\.trim\(\)\|\|null/);
 assert.match(api,/externalConfirmedParticipants:count/);
 assert.match(api,/count<0\|\|count>99/);
 assert.doesNotMatch(api.slice(api.indexOf('export async function updateSessionMeetingPoint'),api.indexOf('export async function pendingSessionInvites')),/retry\(/);
});
test('organizer edits require explicit confirmation and are only visible in owner tools',()=>{
 const screen=read('app/sessions/[id].tsx');
 assert.match(screen,/auth\.token&&owner&&detail/);
 assert.match(screen,/saveMeetingPoint/);
 assert.match(screen,/saveExternalCount/);
 assert.match(screen,/updateSessionMeetingPoint\(id,auth\.token!,meetingDraft\)/);
 assert.match(screen,/updateSessionExternalConfirmations\(id,auth\.token!,Number\(raw\)\)/);
 assert.match(screen,/Alert\.alert\('Atualizar ponto de encontro\?'/);
 assert.match(screen,/Alert\.alert\('Atualizar confirmações externas\?'/);
 assert.match(screen,/setMeetingDraft\(full\.meetingPointInstructions\|\|''\)/);
 assert.match(screen,/setExternalDraft\(String\(full\.externalConfirmedParticipants\?\?0\)\)/);
 assert.doesNotMatch(screen,/Linking\.openURL\('https:\/\/d24sports\.com/);
});
test('server response count is typed, not inferred from roster',()=>{
 const types=read('src/lib/types.ts');
 assert.match(types,/externalConfirmedParticipants\?: number/);
});
