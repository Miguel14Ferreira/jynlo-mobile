'use strict';
/** Pure helpers for the notification centre: icon per type, day groups, short times and grouping of related alerts. */

const KINDS={
 chat:['CHAT_MESSAGE','CALL_INCOMING','CALL_MISSED','ADMIN_MESSAGE'],
 invite:['SESSION_INVITE','COMMUNITY_INVITE','TEAM_MEMBER_INVITE','AVAILABILITY_REQUEST','AVAILABILITY_REMINDER'],
 session:['WAITLIST_PROMOTED','SESSION_REMOVED','SESSION_CANCELLED','SESSION_MEETING_POINT_UPDATED','SESSION_DETAILS_UPDATED',
  'SESSION_POST_GAME_REVIEW','SESSION_REMINDER','NEARBY_SESSION','COMMUNITY_SESSION_CREATED','ATTENDANCE_DISPUTE_ACCEPTED','ATTENDANCE_DISPUTE_REJECTED'],
 payment:['PAYMENT_REMINDER'],
 social:['SOCIAL_NEW_FOLLOWER','SOCIAL_POST_LIKED','SOCIAL_POST_COMMENTED','SOCIAL_STORY_LIKED','SOCIAL_STORY_REPLIED'],
 tournament:['TOURNAMENT_RESULT','TOURNAMENT_LEADER'],
 community:['COMMUNITY_JOIN_REQUEST','COMMUNITY_JOIN_ACCEPTED','COMMUNITY_JOIN_REJECTED','TEAM_ADMIN_TRANSFER','TEAM_ADMIN_ASSIGNED'],
 venue:['VENUE_BOOKING','VENUE_EDIT_DECISION'],
};
function notificationKind(type){
 const t=typeof type==='string'?type.toUpperCase():'';
 for(const [kind,types] of Object.entries(KINDS))if(types.includes(t))return kind;
 return 'other';
}

function startOfDay(ms){const d=new Date(ms);d.setHours(0,0,0,0);return d.getTime();}
/** 'today' | 'yesterday' | 'older', in the phone's own time zone. */
function dayBucket(createdAt,now=Date.now()){
 const ms=Date.parse(createdAt);
 if(!Number.isFinite(ms))return 'older';
 const today=startOfDay(now);
 if(ms>=today)return 'today';
 if(ms>=today-86400000)return 'yesterday';
 return 'older';
}

/** "Há 5 min", "Há 2 h", "Ontem, 21:40", "23 nov". `t` translates; `locale` formats dates. */
function shortTime(createdAt,t,locale='pt-PT',now=Date.now()){
 const ms=Date.parse(createdAt);
 if(!Number.isFinite(ms))return '';
 const diff=now-ms;
 const bucket=dayBucket(createdAt,now);
 if(bucket==='today'){
  if(diff<60000)return t('Agora');
  if(diff<3600000)return t('Há {n} min',{n:Math.floor(diff/60000)});
  return t('Há {n} h',{n:Math.floor(diff/3600000)});
 }
 const time=new Date(ms).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'});
 if(bucket==='yesterday')return t('Ontem, {time}',{time});
 const sameYear=new Date(ms).getFullYear()===new Date(now).getFullYear();
 return new Date(ms).toLocaleDateString(locale,sameYear?{day:'numeric',month:'short'}:{day:'numeric',month:'short',year:'numeric'});
}

/** Related alerts become one row: chat messages from the same conversation, likes on the same post. */
function groupKey(item,bucket){
 const type=typeof item.type==='string'?item.type.toUpperCase():'';
 if(type==='CHAT_MESSAGE')return bucket+'|chat|'+(item.sportsTeamId||'')+'|'+(item.privateGroupId||'')+'|'+(item.sessionId||'')+'|'+(item.communityId||'')+'|'+(item.relatedUsername||item.subject||'');
 if(type==='SOCIAL_POST_LIKED'&&item.postId)return bucket+'|like|'+item.postId;
 return null;
}

/** Newest first, grouped by day; each row carries every notification it stands for. */
function buildSections(items,now=Date.now()){
 const sorted=[...items].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
 const sections={today:[],yesterday:[],older:[]};
 const byKey=new Map();
 for(const item of sorted){
  const bucket=dayBucket(item.createdAt,now);
  const key=groupKey(item,bucket);
  if(key&&byKey.has(key)){byKey.get(key).items.push(item);continue;}
  const row={key:key||('n'+item.id),items:[item],lead:item,bucket};
  if(key)byKey.set(key,row);
  sections[bucket].push(row);
 }
 return ['today','yesterday','older'].map(id=>({id,rows:sections[id]})).filter(s=>s.rows.length);
}

module.exports={notificationKind,dayBucket,shortTime,buildSections};
