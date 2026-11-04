'use strict';
function safeRedirect(target){
 if(typeof target!=='string')return '/(tabs)';
 if(target==='/sessions/create')return target;
 if(/^\/sessions\/[1-9]\d*$/.test(target))return target;
 if(/^\/communities\/(?:[1-9]\d*|create|invites)$/.test(target))return target;
 if(['/feed','/venues','/my-sessions','/notifications'].includes(target))return target;
 if(/^\/venues\/[1-9]\d*$/.test(target))return target;
 return '/(tabs)';
}
module.exports={safeRedirect};
