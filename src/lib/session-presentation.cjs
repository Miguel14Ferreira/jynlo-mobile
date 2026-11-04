'use strict';
/** Pure presentation helpers; server remains authoritative on eligibility and status. */
function minimumPlayersProgress(session){
  if(!session)return null;
  const min=session.minParticipants,max=session.maxParticipants,raw=session.participantCount;
  if(!Number.isSafeInteger(min)||min<1||!Number.isSafeInteger(max)||max<1||min>max||
     !Number.isSafeInteger(raw)||raw<0)return null;
  const count=Math.min(raw,max);
  const missing=Math.max(0,min-count);
  return {required:min,count,missing,percent:Math.max(0,Math.min(100,Math.round(count*100/min)))};
}
function rosterAttendanceLabel(attendanceStatus,sessionStatus){
  // An upcoming session has not yet recorded attendance: never label PENDING as a failure.
  if(sessionStatus!=='COMPLETED')return null;
  const labels={ATTENDED:'Compareceu',NO_SHOW:'Não compareceu',LATE_CANCELLED:'Cancelamento tardio'};
  return labels[attendanceStatus]||null;
}
module.exports={minimumPlayersProgress,rosterAttendanceLabel};
