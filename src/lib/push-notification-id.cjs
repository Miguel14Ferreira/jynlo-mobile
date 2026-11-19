'use strict';
/** Only a positive, safely representable integer may identify an inbox item.
 * Expo/FCM payload data can encode the same ID as a JSON number or decimal string.
 * No URL, route or peer is trusted from the native push payload.
 */
function pushNotificationId(value){
 if(typeof value==='number')
  return Number.isSafeInteger(value)&&value>0?String(value):null;
 if(typeof value!=='string'||! /^[1-9][0-9]{0,15}$/.test(value))return null;
 const parsed=Number(value);
 return Number.isSafeInteger(parsed)&&parsed>0?String(parsed):null;
}
module.exports={pushNotificationId};
