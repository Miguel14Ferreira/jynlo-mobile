'use strict';
/** A successful HTTP response without an explicit state is not a confirmed join. */
function confirmedSessionJoin(result){
 if(!result||typeof result!=='object')return null;
 if(result.state==='PARTICIPANT')return {state:'PARTICIPANT',message:'Presença confirmada pelo servidor.'};
 if(result.state==='WAITLISTED'){
  const position=result.waitlistPosition;
  if(position!=null&&(!Number.isSafeInteger(position)||position<=0))return null;
  return {state:'WAITLISTED',message:position!=null?'Entraste na lista de espera · posição '+position+'.':'Entraste na lista de espera.'};
 }
 return null;
}
module.exports={confirmedSessionJoin};
