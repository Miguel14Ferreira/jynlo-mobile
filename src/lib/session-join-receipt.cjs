'use strict';
const {tr}=require('./i18n-core.cjs');
/** A successful HTTP response without an explicit state is not a confirmed join. */
function confirmedSessionJoin(result){
 if(!result||typeof result!=='object')return null;
 if(result.state==='PARTICIPANT')return {state:'PARTICIPANT',message:tr('Presença confirmada pelo servidor.')};
 if(result.state==='WAITLISTED'){
  const position=result.waitlistPosition;
  if(position!=null&&(!Number.isSafeInteger(position)||position<=0))return null;
  return {state:'WAITLISTED',message:position!=null?tr('Entraste na lista de espera · posição ')+position+'.':tr('Entraste na lista de espera.')};
 }
 return null;
}
module.exports={confirmedSessionJoin};
