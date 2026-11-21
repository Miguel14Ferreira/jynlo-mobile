'use strict';
/** Community owners/admins can open a members-only session to everyone, or restrict it back (same rules as the web). */
function upcomingOpen(s,now){
 const start=Date.parse(s&&s.gameDate);
 return !!s&&(s.status==='OPEN'||s.status==='FULL')&&Number.isFinite(start)&&start>(now||Date.now());
}
function canOpenToPublic(s,canManage,now){
 return !!canManage&&s&&s.audience==='COMMUNITY_ONLY'&&upcomingOpen(s,now)&&s.participantCount<s.maxParticipants;
}
function canRestrictToMembers(s,canManage,communityId,now){
 return !!canManage&&s&&s.audience==='PUBLIC'&&(s.communityId==null||s.communityId===communityId)&&upcomingOpen(s,now);
}
module.exports={canOpenToPublic,canRestrictToMembers};
