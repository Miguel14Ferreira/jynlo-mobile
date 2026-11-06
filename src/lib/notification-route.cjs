'use strict';
const validId=value=>Number.isSafeInteger(value)&&value>0;
const validPeer=value=>typeof value==='string'&&/^[a-zA-Z0-9_.@-]{1,128}$/.test(value);
function notificationDestination(item){
 if(!item||typeof item!=='object')return null;
 const type=typeof item.type==='string'?item.type.toUpperCase():'';
 if(type==='COMMUNITY_INVITE')return {kind:'invites'};
 if(type==='COMMUNITY_JOIN_REQUEST'||type==='COMMUNITY_JOIN_ACCEPTED'||type==='COMMUNITY_JOIN_REJECTED'){
  return validId(item.communityId)?{kind:'community',id:String(item.communityId)}:null;
 }
 const isMessage=type.includes('CHAT')||type.includes('MESSAGE')||type.includes('DIRECT');
 if(isMessage){
  if(validId(item.sessionId))return {kind:'session-chat',id:String(item.sessionId)};
  if(validId(item.communityId))return {kind:'community-chat',id:String(item.communityId)};
  if(validPeer(item.relatedUsername))return {kind:'direct-chat',peer:item.relatedUsername};
 }
 if(validId(item.sessionId))return {kind:'session',id:String(item.sessionId)};
 if(validId(item.communityId))return {kind:'community',id:String(item.communityId)};
 return null;
}
module.exports={notificationDestination};
