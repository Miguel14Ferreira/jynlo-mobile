'use strict';
/** Presentation policy only. The Jynlo server remains the final authority on all writes. */
function registrationAction(s, viewer, at = Date.now()) {
  if (!s) return {kind:'NONE',label:'Sessão indisponível'};
  if (!viewer) return {kind:'LOGIN',label:'Entrar para participar'};
  if (s.joined) return {kind:'JOINED',label:'Presença confirmada'};
  if (s.waitlisted) return {kind:'WAITLISTED',label:'Estás na lista de espera'};
  if (s.status === 'CANCELLED' || s.status === 'COMPLETED')
    return {kind:'CLOSED',label:'Inscrições encerradas'};
  if (s.status !== 'OPEN' && s.status !== 'FULL')
    return {kind:'CLOSED',label:'Inscrições indisponíveis'};
  if (s.registrationOpeningMode === 'MANUAL') {
    // The server may keep a manual opening mode even after it has been opened.
    // The client cannot infer this from the enum: allow the server to decide.
    return {kind:'JOIN',label:'Pedir inscrição',hint:'A abertura manual é confirmada pelo servidor.'};
  }
  if (s.registrationOpeningMode === 'SCHEDULED' && s.registrationOpensAt) {
    const openAt = Date.parse(s.registrationOpensAt);
    if (Number.isFinite(openAt) && openAt > at)
      return {kind:'SCHEDULED',label:'Inscrições ainda não abertas'};
  }
  if (s.privateGame) return {kind:'PASSWORD',label:'Entrar na sessão privada'};
  if (s.status === 'FULL' || s.participantCount >= s.maxParticipants)
    return {kind:'WAITLIST',label:'Pedir lugar na lista de espera'};
  return {kind:'JOIN',label:'Confirmar presença'};
}
function isOrganizer(s,viewer) {
  return Boolean(viewer && s?.creatorUsername && s.creatorUsername.toLowerCase() === viewer.toLowerCase());
}
function canLeave(s) {
  return Boolean(s && (s.joined || s.waitlisted) && s.status !== 'CANCELLED' && s.status !== 'COMPLETED');
}
function canViewRoster(s,viewer) { return Boolean(s && (s.joined || isOrganizer(s,viewer))); }
function safeExactAddress(s,viewer) {
  return s && s.canSeeExactAddress && (s.joined || isOrganizer(s,viewer))
    ? (s.address || null) : null;
}
function safeMeetingPoint(s,viewer) {
  return s && s.canSeeExactAddress && (s.joined || isOrganizer(s,viewer))
    ? (s.meetingPointInstructions || null) : null;
}
module.exports={registrationAction,isOrganizer,canLeave,canViewRoster,safeExactAddress,safeMeetingPoint};
