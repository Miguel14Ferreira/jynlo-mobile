'use strict';
const {tr}=require('./i18n-core.cjs');
const {vacancies}=require('./format.cjs');

/** Presentation only: joining still requires server-side permission checks. */
function sessionCardStatus(session,at=Date.now()){
  const startsAt=Date.parse(session?.gameDate||'');
  const past=Number.isFinite(startsAt)&&startsAt<=at;
  if(session?.status==='CANCELLED')return {label:tr('Cancelada'),tone:'unavailable'};
  if(session?.status==='COMPLETED')return {label:tr('Concluída'),tone:'unavailable'};
  if(past)return {label:tr('Data ultrapassada'),tone:'unavailable'};
  if(session.joinedByViewer)return {label:tr('Já vais!'),tone:'joined'};
  if(session.waitlistedByViewer)return {label:tr('Lista de espera'),tone:'waiting'};
  if(session.status!=='OPEN')return {label:tr('Indisponível'),tone:'unavailable'};
  if(session.privateGame)return {label:tr('Sessão privada'),tone:'unavailable'};
  if(session.audience==='COMMUNITY_ONLY')return {label:tr('Só comunidade'),tone:'unavailable'};
  // Missing or corrupt capacity is unknown, not proof of a full session.
  if(!Number.isSafeInteger(session.maxParticipants)||session.maxParticipants<=0||
     !Number.isSafeInteger(session.participantCount)||session.participantCount<0)
    return {label:tr('Vagas por confirmar'),tone:'unavailable'};
  const free=vacancies(session);
  if(free<=0)return {label:tr('Sem vagas'),tone:'full'};
  return {label:free===1?tr('1 vaga'):tr('{n} vagas',{n:free}),tone:'available'};
}
function participationProgress(session){
  const max=Number(session.maxParticipants);
  const count=Number(session.participantCount);
  if(!Number.isFinite(max)||max<=0||!Number.isFinite(count))return 0;
  return Math.min(1,Math.max(0,count/max));
}
module.exports={sessionCardStatus,participationProgress};
