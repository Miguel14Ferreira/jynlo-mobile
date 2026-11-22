'use strict';
const {tr}=require('./i18n-core.cjs');
/** Registration rules mirror backend CommunityTournamentService. The backend remains authoritative. */
function canSeeIndividualRoster(tournament){return !!tournament&&tournament.entryType!=='TEAM';}
/** Event series ("classificação por provas") keep entries open while in progress. */
function entriesOpen(tournament){
 return !!tournament&&(tournament.status==='DRAFT'||(tournament.status==='IN_PROGRESS'&&tournament.scoringMode==='EVENT_RANKING'));
}
function canManageConfirmation(role,tournament){return !!tournament&&tournament.entryType!=='TEAM'&&entriesOpen(tournament)&&(role==='OWNER'||role==='ADMIN');}
function ownEnrollment(entries,username){
 if(!username)return null;
 return (entries||[]).find(p=>p?.username===username)||null;
}
function registrationAction(tournament,entries,username,hasMore){
 if(!tournament||tournament.entryType==='TEAM'||!entriesOpen(tournament)||!username)return 'NONE';
 // Leaving is only possible before the start (results may already exist).
 if(ownEnrollment(entries,username))return tournament.status==='DRAFT'?'LEAVE':'NONE';
 // Do not offer joining while the user's enrollment could be on an unread page.
 return hasMore?'NONE':'JOIN';
}
function participantStatus(value){
 if(value==='PENDING')return tr('Aguardar confirmação');
 if(value==='CONFIRMED')return 'Confirmado';
 return tr('Estado desconhecido');
}
function canConfirmParticipant(role,tournament,participant){
 return canManageConfirmation(role,tournament)&&participant?.status==='PENDING';
}
module.exports={entriesOpen,canSeeIndividualRoster,canManageConfirmation,ownEnrollment,registrationAction,participantStatus,canConfirmParticipant};
