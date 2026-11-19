'use strict';
/**
 * A failed POST may have been accepted before its response was lost.
 * HTTP 4xx explicitly rejected the request; timeouts, transport failures,
 * unconfirmed receipts and 5xx responses do not prove it was rejected.
 */
function uncertainChatSend(error){
 const status=Number(error?.status);
 return !(Number.isInteger(status)&&status>=400&&status<500);
}
module.exports={uncertainChatSend};
