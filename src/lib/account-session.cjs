'use strict';
/** Current Jynlo policy: one active identity; to change account, sign out and sign back in. */
function assertCanStartLogin(activeUsername){
 if(activeUsername)throw new Error('Termina primeiro a sessão atual para entrares com outra conta.');
}
module.exports={assertCanStartLogin};
