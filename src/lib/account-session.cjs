'use strict';
const {tr}=require('./i18n-core.cjs');
/** Current Jynlo policy: one active identity; to change account, sign out and sign back in. */
function assertCanStartLogin(activeUsername){
 if(activeUsername)throw new Error(tr('Termina primeiro a sessão atual para entrares com outra conta.'));
}
module.exports={assertCanStartLogin};
