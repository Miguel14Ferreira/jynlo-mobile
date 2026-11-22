const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {canSeeIndividualRoster,canManageConfirmation,ownEnrollment,registrationAction,participantStatus,canConfirmParticipant}=require('../src/lib/tournament-registration-core.cjs');
const draft={entryType:'INDIVIDUAL',format:'KNOCKOUT',status:'DRAFT'};
const pending={profileId:20,username:'André',displayName:'André',joinedAt:'2026-11-02T10:00:00Z',status:'PENDING'};
const confirmed={...pending,status:'CONFIRMED'};
test('listagem só está disponível para inscrições individuais, sem simular plantéis de equipa',()=>{
 assert.equal(canSeeIndividualRoster(draft),true);
 assert.equal(canSeeIndividualRoster({...draft,entryType:'TEAM'}),false);
 assert.equal(canSeeIndividualRoster(null),false);
});
test('pedido de inscrição só é permitido em DRAFT e após ler todas as páginas',()=>{
 assert.equal(registrationAction(draft,[],'Tiago',false),'JOIN');
 assert.equal(registrationAction(draft,[],'Tiago',true),'NONE');
 assert.equal(registrationAction(draft,[],null,false),'NONE');
 assert.equal(registrationAction({...draft,status:'IN_PROGRESS'},[],'Tiago',false),'NONE');
 assert.equal(registrationAction({...draft,entryType:'TEAM'},[],'Tiago',false),'NONE');
});
test('cancelar inscrição só quando o utilizador já aparece no servidor e torneio está em DRAFT',()=>{
 assert.equal(registrationAction(draft,[pending],'André',false),'LEAVE');
 assert.equal(registrationAction(draft,[pending],'André',true),'LEAVE');
 assert.equal(registrationAction({...draft,status:'COMPLETED'},[pending],'André',false),'NONE');
 assert.equal(ownEnrollment([pending],'André')?.status,'PENDING');
 assert.equal(ownEnrollment([pending],'Tiago'),null);
});
test('confirmar inscrições exige cargo de organizador, DRAFT e pedido pendente',()=>{
 assert.equal(canManageConfirmation('OWNER',draft),true);
 assert.equal(canManageConfirmation('ADMIN',draft),true);
 assert.equal(canManageConfirmation('MEMBER',draft),false);
 assert.equal(canManageConfirmation('OWNER',{...draft,status:'IN_PROGRESS'}),false);
 assert.equal(canConfirmParticipant('ADMIN',draft,pending),true);
 assert.equal(canConfirmParticipant('ADMIN',draft,confirmed),false);
 assert.equal(canConfirmParticipant('MEMBER',draft,pending),false);
});
test('estado pedido não é anunciado como confirmação efetiva',()=>{
 assert.equal(participantStatus('PENDING'),'Aguardar confirmação');
 assert.equal(participantStatus('CONFIRMED'),'Confirmado');
 assert.equal(participantStatus('X'),'Estado desconhecido');
});
test('API de inscrição usa endpoints e verbos exatos do backend, sem auto-retry',()=>{
 const api=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/tournament-registration-api.ts'),'utf8'));
 for(const endpoint of ['/participants?page=${p}','/participants/me','/participants/${id}/confirm'])assert.ok(api.includes(endpoint),endpoint);
 assert.match(api,/method:'PUT'/);
 assert.match(api,/method:'DELETE'/);
 assert.doesNotMatch(api,/retry\(|setTimeout\(|setInterval\(/);
 assert.match(api,/await demoMember\(cid,username\)/);
});
test('ecrã tem ação de inscrição explícita, cancelamento confirmado e não diz que PENDING está confirmado',()=>{
 const screen=untranslate(fs.readFileSync(path.join(__dirname,'../app/tournaments/[communityId]/[id]/participants.tsx'),'utf8'));
 assert.match(screen,/Alert\.alert\('Cancelar inscrição\?'/);
 assert.match(screen,/Pedir inscrição no torneio/);
 assert.match(screen,/Carregar mais participantes/);
 assert.match(screen,/Aguarda confirmação do organizador/);
 assert.match(screen,/canConfirmParticipant/);
});
