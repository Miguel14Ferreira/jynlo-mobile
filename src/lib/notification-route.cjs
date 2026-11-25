'use strict';
const validId=value=>Number.isSafeInteger(value)&&value>0;
const validPeer=value=>typeof value==='string'&&/^[a-zA-Z0-9_.@-]{1,128}$/.test(value);
function notificationDestination(item){
 if(!item||typeof item!=='object')return null;
 const type=typeof item.type==='string'?item.type.toUpperCase():'';
 if(type==='SOCIAL_POST_LIKED'||type==='SOCIAL_POST_COMMENTED'){
  // Only the server-owned numeric post reference can identify the target.
  // Older notifications had no postId: retain the historical profile fallback.
  if(validId(item.postId))return {kind:'social-post',id:String(item.postId)};
  return validPeer(item.relatedUsername)?{kind:'social-profile',peer:item.relatedUsername}:null;
 }
 if(type==='SOCIAL_STORY_REPLIED'){
  // Replies outlive the 24-hour Story. Always open the recipient-only reply inbox.
  return {kind:'story-replies'};
 }
 if(type==='SOCIAL_STORY_LIKED'){
  if(validId(item.storyId))return {kind:'social-story',id:String(item.storyId)};
  return validPeer(item.relatedUsername)?{kind:'social-profile',peer:item.relatedUsername}:null;
 }
 if(type==='SOCIAL_NEW_FOLLOWER'){
  return validPeer(item.relatedUsername)?{kind:'social-profile',peer:item.relatedUsername}:null;
 }
 if(type==='TOURNAMENT_RESULT'||type==='TOURNAMENT_LEADER'){
  // Open the tournament itself; older or partial alerts fall back to the community.
  if(validId(item.communityId)&&validId(item.competitionTournamentId))
   return {kind:'tournament',id:String(item.competitionTournamentId),communityId:String(item.communityId)};
  return validId(item.communityId)?{kind:'community',id:String(item.communityId)}:null;
 }
 if(type==='AVAILABILITY_REQUEST'||type==='AVAILABILITY_REMINDER'){
  // "Quem pode?" lives on the group or community page.
  if(validId(item.privateGroupId))return {kind:'group-chat',id:String(item.privateGroupId)};
  return validId(item.communityId)?{kind:'community',id:String(item.communityId)}:null;
 }
 // A ringing call is answered from Messages (it shows the incoming call); a missed call opens the chat with the caller.
 if(type==='CALL_INCOMING')return {kind:'messages'};
 if(type==='CALL_MISSED')return validPeer(item.relatedUsername)?{kind:'direct-chat',peer:item.relatedUsername}:null;
 // Court booking news (new request, confirmed, declined, cancelled, venue management decisions).
 if(type==='VENUE_BOOKING')return {kind:'venue-bookings'};
 if(type==='COMMUNITY_INVITE')return {kind:'invites'};
 if(type==='COMMUNITY_JOIN_REQUEST'||type==='COMMUNITY_JOIN_ACCEPTED'||type==='COMMUNITY_JOIN_REJECTED'){
  return validId(item.communityId)?{kind:'community',id:String(item.communityId)}:null;
 }
 // Someone who is not a friend wrote for the first time: open "Pedidos de mensagem".
 if(type==='CHAT_MESSAGE'&&item.subject==='Pedido de mensagem')return {kind:'message-requests'};
 const isMessage=type.includes('CHAT')||type.includes('MESSAGE')||type.includes('DIRECT');
 if(isMessage){
  // Checked first: a group alert names the sender but must open the group, not a direct chat.
  if(validId(item.sportsTeamId))return {kind:'team-chat',id:String(item.sportsTeamId)};
  if(validId(item.privateGroupId))return {kind:'group-chat',id:String(item.privateGroupId)};
  if(validId(item.sessionId))return {kind:'session-chat',id:String(item.sessionId)};
  if(validId(item.communityId))return {kind:'community-chat',id:String(item.communityId)};
  if(validPeer(item.relatedUsername))return {kind:'direct-chat',peer:item.relatedUsername};
 }
 if(validId(item.sessionId))return {kind:'session',id:String(item.sessionId)};
 if(validId(item.communityId))return {kind:'community',id:String(item.communityId)};
 return null;
}
module.exports={notificationDestination};
