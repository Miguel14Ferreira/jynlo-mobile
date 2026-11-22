'use strict';
const {tr}=require('./i18n-core.cjs');

/**
 * Explicit, public-only score card text. Never includes individual player
 * names, scorers, meeting points, GPS, access tokens or private team details.
 * A missing/partial official score is not equivalent to a 0-0 result.
 */
function publicSessionResultMessage(game, result, sessionId) {
  if (!game || game.canSharePublicly !== true || game.status !== 'COMPLETED'
      || !result || !Number.isSafeInteger(sessionId) || sessionId <= 0
      || result.sessionId !== sessionId
      || !Number.isSafeInteger(result.roundId) || result.roundId <= 0
      || !Number.isSafeInteger(result.scoreA) || result.scoreA < 0
      || !Number.isSafeInteger(result.scoreB) || result.scoreB < 0) return null;
  const sport = typeof game.sport === 'string' ? game.sport.trim().slice(0, 60) : '';
  const title = sport ? sport + ' · ' : '';
  return tr('🏆 Resultado oficial Jynlo\n') + title +
    tr('Equipa A {a} — {b} Equipa B',{a:result.scoreA,b:result.scoreB}) + '\n' +
    'https://jynlosports.com/sessions/' + sessionId;
}

module.exports = { publicSessionResultMessage };
