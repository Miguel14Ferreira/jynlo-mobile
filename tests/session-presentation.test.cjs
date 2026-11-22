const untranslate=require('./untranslate.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {minimumPlayersProgress,rosterAttendanceLabel}=require('../src/lib/session-presentation.cjs');
const base={minParticipants:6,maxParticipants:10,participantCount:4};
test('minimo de jogadores mostra faltas reais e percentagem limitada',()=>{
 assert.deepEqual(minimumPlayersProgress(base),{required:6,count:4,missing:2,percent:67});
 assert.deepEqual(minimumPlayersProgress({...base,participantCount:8}),{required:6,count:8,missing:0,percent:100});
 assert.deepEqual(minimumPlayersProgress({...base,participantCount:20}),{required:6,count:10,missing:0,percent:100});
});
test('rejeita minimos ausentes ou inconsistentes, sem inventar valores',()=>{
 for(const s of [null,{...base,minParticipants:0},{...base,minParticipants:11},{...base,minParticipants:null},{...base,participantCount:-1},{...base,participantCount:NaN}])
  assert.equal(minimumPlayersProgress(s),null);
});
test('estado de assiduidade so aparece quando sessao terminou',()=>{
 assert.equal(rosterAttendanceLabel('PENDING','OPEN'),null);
 assert.equal(rosterAttendanceLabel('NO_SHOW','OPEN'),null);
 assert.equal(rosterAttendanceLabel('ATTENDED','COMPLETED'),'Compareceu');
 assert.equal(rosterAttendanceLabel('NO_SHOW','COMPLETED'),'Não compareceu');
 assert.equal(rosterAttendanceLabel('LATE_CANCELLED','COMPLETED'),'Cancelamento tardio');
 assert.equal(rosterAttendanceLabel('PENDING','COMPLETED'),null);
});
test('Quem vai protege lista e utiliza avatares sem criar endpoints novos',()=>{
 const view=untranslate(fs.readFileSync(path.join(__dirname,'../app/sessions/[id].tsx'),'utf8'));
 assert.ok(view.includes('canViewRoster(full,auth.username)'));
 assert.ok(view.includes('detail&&canViewRoster(detail,auth.username)'));
 assert.ok(view.includes('resolveJynloMedia(participant.profilePicUrl)'));
 assert.ok(view.includes('minimumPlayersProgress(detail)'));
 assert.ok(view.includes('rosterError'));
 assert.ok(view.includes('Abrir comunidade associada'));
});

test('participation status distinguishes past, future, cancelled and completed sessions',()=>{
 const {sessionParticipationLabel}=require('../src/lib/session-teams-presentation.cjs');
 const now=Date.parse('2026-11-13T20:00:00Z');
 const open={status:'OPEN',gameDate:'2026-11-14T20:00:00Z'};
 assert.equal(sessionParticipationLabel(open,now),'Aberta');
 assert.equal(sessionParticipationLabel({...open,gameDate:'2026-11-12T20:00:00Z'},now),'Data ultrapassada');
 assert.equal(sessionParticipationLabel({...open,status:'CANCELLED'},now),'Cancelada');
 assert.equal(sessionParticipationLabel({...open,status:'COMPLETED'},now),'Concluída');
});
