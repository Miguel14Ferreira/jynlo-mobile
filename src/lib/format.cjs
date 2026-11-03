'use strict';
function vacancies(s) { return Math.max(0, (s.maxParticipants ?? 0) - (s.participantCount ?? 0)); }
function canJoin(s) { return s.status === 'OPEN' && !s.privateGame && !s.joined && !s.waitlisted && vacancies(s) > 0; }
function money(price) { return (price || 0) <= 0 ? 'Grátis' : Number(price).toFixed(2).replace('.', ',') + ' €'; }
function formatDate(iso) {
  if (!iso || !Number.isFinite(Date.parse(iso))) return 'Data por confirmar';
  return new Intl.DateTimeFormat('pt-PT', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', timeZone: 'Europe/Lisbon' }).format(new Date(iso));
}
module.exports = { vacancies, canJoin, money, formatDate };
