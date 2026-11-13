'use strict';
// An unknown server status must never be treated as permission to submit
// another guest RSVP after a network failure.
function guestReceiptStatusCategory(status){
 if(status==='APPROVED'||status==='LINKED'||status==='PENDING')return 'active';
 if(status==='CANCELLED'||status==='REJECTED')return 'closed';
 return 'unknown';
}
module.exports={guestReceiptStatusCategory};
