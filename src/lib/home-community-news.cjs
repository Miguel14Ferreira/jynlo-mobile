'use strict';
// What is new in each of the player's communities, for the Início card.
// Same rule as the web feed: unread messages first, otherwise the next game,
// otherwise the member count.

/** @returns {{kind:'unread',count:number}|{kind:'game',gameDate:string}|{kind:'members',count:number}} */
function communityNews(group, unreadById, sessions, now) {
  const unread = Number(unreadById && unreadById.get(String(group.id))) || 0;
  if (unread > 0) return { kind: 'unread', count: unread };
  const at = typeof now === 'number' ? now : Date.now();
  const next = (Array.isArray(sessions) ? sessions : [])
    .filter(s => s && s.communityId === group.id && Date.parse(s.gameDate) > at)
    .sort((a, b) => Date.parse(a.gameDate) - Date.parse(b.gameDate))[0];
  if (next) return { kind: 'game', gameDate: next.gameDate };
  return { kind: 'members', count: Number(group.memberCount) || 0 };
}

/** Map community id → unread count from inbox summaries. */
function unreadMap(summaries) {
  const map = new Map();
  for (const row of Array.isArray(summaries) ? summaries : []) {
    if (row && row.kind === 'community') map.set(String(row.id), Number(row.unreadCount) || 0);
  }
  return map;
}

module.exports = { communityNews, unreadMap };
