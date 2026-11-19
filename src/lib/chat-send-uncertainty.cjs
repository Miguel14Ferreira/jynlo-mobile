'use strict';
/**
 * A failed POST may have been accepted before its response was lost.
 * Most HTTP 4xx responses explicitly reject the request; 408/499 timeouts,
 * transport failures,
 * unconfirmed receipts and 5xx responses do not prove it was rejected.
 */
function uncertainChatSend(error){
 const status=Number(error?.status);
 return !(Number.isInteger(status)&&status>=400&&status<500&&status!==408&&status!==499);
}
module.exports={uncertainChatSend};
