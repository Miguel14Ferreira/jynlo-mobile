'use strict';
function validId(value){
 return typeof value==='string' && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));
}
function safeRedirect(target){
 if(typeof target!=='string')return '/(tabs)';
 if(target==='/sessions/create')return target;
 let match=target.match(/^\/sessions\/([1-9]\d*)$/);
 if(match)return validId(match[1])?target:'/(tabs)';
 match=target.match(/^\/communities\/([1-9]\d*)$/);
 if(match)return validId(match[1])?target:'/(tabs)';
 if(target==='/communities/create'||target==='/communities/invites')return target;
 match=target.match(/^\/tournaments\/([1-9]\d*)\/([1-9]\d*)\/teams\/([1-9]\d*)$/);
 if(match)return match.slice(1).every(validId)?target:'/(tabs)';
 if(['/feed','/venues','/my-sessions','/notifications'].includes(target))return target;
 match=target.match(/^\/venues\/([1-9]\d*)$/);
 if(match)return validId(match[1])?target:'/(tabs)';
 return '/(tabs)';
}
module.exports={safeRedirect};
