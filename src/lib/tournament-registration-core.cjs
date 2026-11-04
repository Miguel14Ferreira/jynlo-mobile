'use strict';
/** Registration rules mirror backend CommunityTournamentService. The backend remains authoritative. */
function canSeeIndividualRoster(tournament){return !!tournament&&tournament.entryType!=='TEAM';}
function canManageConfirmation(role,tournament){return !!tournament&&tournament.entryType!=='TEAM'&&tournament.status==='DRAFT'&&(role==='OWNER'||role==='ADMIN');}
function ownEnrollment(entries,username){
 if(!username)return null;
 return (entries||[]).find(p=>p?.username===username)||null;
}
function registrationAction(tournament,entries,username,hasMore){
 if(!tournament||tournament.entryType==='TEAM'||tournament.status!=='DRAFT'||!username)return 'NONE';
 if(ownEnrollment(entries,username))return 'LEAVE';
 // Do not offer joining while the user's enrollment could be on an unread page.
 return hasMore?'NONE':'JOIN';
}
function participantStatus(value){
 if(value==='PENDING')return 'Aguardar confirmação';
 if(value==='CONFIRMED')return 'Confirmado';
 return 'Estado desconhecido';
}
function canConfirmParticipant(role,tournament,participant){
 return canManageConfirmation(role,tournament)&&participant?.status==='PENDING';
}
module.exports={canSeeIndividualRoster,canManageConfirmation,ownEnrollment,registrationAction,participantStatus,canConfirmParticipant};
