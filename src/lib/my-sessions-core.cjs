'use strict';
/** Categorize only authenticated session summaries. Do not infer attendance from a past date. */
function organizeMySessions(data,now=Date.now()){
 const seen=new Set();
 const pending=[],history=[];
 const categories=[
  ['Criadas por mim',Array.isArray(data?.created)?data.created:[]],
  ['Vou participar',Array.isArray(data?.joined)?data.joined:[]],
  ['Lista de espera',Array.isArray(data?.waitlisted)?data.waitlisted:[]]
 ];
 for(const [title,items] of categories){
  const upcoming=[],past=[];
  for(const item of items){
   if(!item||!Number.isSafeInteger(item.id)||item.id<=0||seen.has(item.id))continue;
   const timestamp=Date.parse(item.gameDate);
   if(!Number.isFinite(timestamp))continue;
   seen.add(item.id);
   // Server cancellation and completion win over event time.
   if(item.status==='CANCELLED'||item.status==='COMPLETED'||timestamp<=now)past.push(item);
   else upcoming.push(item);
  }
  upcoming.sort((a,b)=>Date.parse(a.gameDate)-Date.parse(b.gameDate)||a.id-b.id);
  past.sort((a,b)=>Date.parse(b.gameDate)-Date.parse(a.gameDate)||b.id-a.id);
  pending.push({title,items:upcoming});
  history.push({title,items:past});
 }
 return {upcoming:pending,history};
}
module.exports={organizeMySessions};
