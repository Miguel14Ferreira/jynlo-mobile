'use strict';
const {vacancies}=require('./format.cjs');

/** Presentation only: joining still requires server-side permission checks. */
function sessionCardStatus(session){
  if(session.joinedByViewer)return {label:'Já vais!',tone:'joined'};
  if(session.waitlistedByViewer)return {label:'Lista de espera',tone:'waiting'};
  if(session.status!=='OPEN')return {label:'Indisponível',tone:'unavailable'};
  if(session.privateGame)return {label:'Sessão privada',tone:'unavailable'};
  if(session.audience==='COMMUNITY_ONLY')return {label:'Só comunidade',tone:'unavailable'};
  // Missing or corrupt capacity is unknown, not proof of a full session.
  if(!Number.isSafeInteger(session.maxParticipants)||session.maxParticipants<=0||
     !Number.isSafeInteger(session.participantCount)||session.participantCount<0)
    return {label:'Vagas por confirmar',tone:'unavailable'};
  const free=vacancies(session);
  if(free<=0)return {label:'Sem vagas',tone:'full'};
  return {label:free===1?'1 vaga':free+' vagas',tone:'available'};
}
function participationProgress(session){
  const max=Number(session.maxParticipants);
  const count=Number(session.participantCount);
  if(!Number.isFinite(max)||max<=0||!Number.isFinite(count))return 0;
  return Math.min(1,Math.max(0,count/max));
}
module.exports={sessionCardStatus,participationProgress};
