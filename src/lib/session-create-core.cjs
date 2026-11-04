'use strict';
function parseSessionDate(day,time,now=Date.now()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(day).trim())||!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time).trim()))
  throw Error('Indica uma data AAAA-MM-DD e uma hora HH:mm.');
 const local=new Date(String(day).trim()+'T'+String(time).trim()+':00');
 if(!Number.isFinite(local.getTime())||
  local.getFullYear()!==Number(day.slice(0,4))||local.getMonth()+1!==Number(day.slice(5,7))||
  local.getDate()!==Number(day.slice(8,10))||
  local.getHours()!==Number(time.slice(0,2))||local.getMinutes()!==Number(time.slice(3,5)))
  throw Error('Data ou hora inválida no fuso horário do telemóvel.');
 if(local.getTime()<=now+5*60000)throw Error('Escolhe uma sessão futura, com pelo menos cinco minutos de antecedência.');
 return local.toISOString();
}
function createSessionPayload(input,allowedSports,now=Date.now()){
 const sport=String(input.sport||'').trim();
 if(!Array.isArray(allowedSports)||!allowedSports.includes(sport))throw Error('Seleciona uma modalidade do catálogo Jynlo.');
 const venueId=input.venueId==null?null:Number(input.venueId);
 if(venueId!==null&&(!Number.isSafeInteger(venueId)||venueId<=0))throw Error('Recinto inválido.');
 const city=String(input.city||'').trim();
 if(city.length<2||city.length>120||!/^[\p{L}\p{M}][\p{L}\p{M}\d .,'’()/-]{1,119}$/u.test(city))throw Error('Indica uma localidade válida.');
 const address=String(input.address||'').trim();
 if(!address||address.length>500)throw Error('Indica uma morada válida (até 500 caracteres).');
 const maxText=String(input.maxParticipants||'').trim();
 if(!/^\d{1,3}$/.test(maxText))throw Error('Número de participantes inválido.');
 const maxParticipants=Number(maxText);
 if(maxParticipants<2||maxParticipants>100)throw Error('A sessão deve permitir entre 2 e 100 participantes.');
 const priceText=String(input.price||'0').trim().replace(',','.');
 if(!/^\d{1,6}(?:\.\d{1,2})?$/.test(priceText))throw Error('Indica um preço válido, com até duas casas decimais.');
 const priceAmount=Number(priceText);
 const externalText=String(input.externalConfirmedParticipants??'0').trim();
 if(!/^\d{1,2}$/.test(externalText))throw Error('Indica quantos jogadores já tens confirmados.');
 const externalConfirmedParticipants=Number(externalText);
 if(externalConfirmedParticipants>maxParticipants-1)throw Error('Os jogadores externos não podem ocupar a vaga do organizador.');
 const minText=String(input.minParticipants??'2').trim();
 if(!/^\d{1,3}$/.test(minText))throw Error('Mínimo de participantes inválido.');
 const minParticipants=Number(minText);
 if(minParticipants<2||minParticipants>maxParticipants)throw Error('O mínimo deve estar entre 2 e a capacidade total.');
 const communityId=input.communityId==null?null:Number(input.communityId);
 if(communityId!==null&&(!Number.isSafeInteger(communityId)||communityId<=0))throw Error('Comunidade inválida.');
 const registrationOpeningMode=input.registrationOpeningMode??'IMMEDIATE';
 if(!['IMMEDIATE','MANUAL','SCHEDULED'].includes(registrationOpeningMode))
  throw Error('Modo de abertura de inscrições inválido.');
 if(communityId===null&&registrationOpeningMode!=='IMMEDIATE')throw Error('Convocatórias manuais ou programadas exigem uma comunidade.');
 const gameDate=parseSessionDate(input.day,input.time,now);
 let registrationOpensAt=null;
 if(registrationOpeningMode==='SCHEDULED'){
  registrationOpensAt=parseSessionDate(input.registrationDay||'',input.registrationTime||'',now);
  if(Date.parse(registrationOpensAt)>=Date.parse(gameDate))
   throw Error('A abertura das inscrições deve anteceder a sessão.');
 }
 const recurrence=input.recurrence??'NONE';
 if(!['NONE','WEEKLY','BIWEEKLY'].includes(recurrence))throw Error('Repetição inválida.');
 if(communityId===null&&recurrence!=='NONE')throw Error('As sessões recorrentes exigem uma comunidade.');
 let recurrenceOccurrences=null,recurrenceTimeZone=null;
 if(recurrence!=='NONE'){
  const text=String(input.recurrenceOccurrences??'').trim();
  if(!/^(?:[2-9]|[1-4][0-9]|5[0-2])$/.test(text))throw Error('Escolhe entre 2 e 52 repetições.');
  recurrenceOccurrences=Number(text);
  const zone=String(input.recurrenceTimeZone||'').trim();
  if(!zone||zone.length>64)throw Error('Não foi possível identificar o fuso horário para repetir sessões.');
  try{new Intl.DateTimeFormat('en-US',{timeZone:zone});}
  catch{throw Error('Fuso horário inválido para repetição de sessões.');}
  recurrenceTimeZone=zone;
 }
 const extraSlots=Array.isArray(input.additionalWeeklySlots)?input.additionalWeeklySlots:[];
 if(extraSlots.length>6)throw Error('Escolhe no máximo sete sessões por semana.');
 if(recurrence!=='WEEKLY'&&extraSlots.length>0)
  throw Error('Horários adicionais só estão disponíveis com repetição semanal.');
 const additionalWeeklyGameDates=[];
 if(extraSlots.length){
  const first=Date.parse(gameDate);
  const endOfWeek=new Date(input.day+'T'+input.time+':00');
  endOfWeek.setDate(endOfWeek.getDate()+7);
  const end=endOfWeek.getTime();
  const unique=new Set([first]);
  for(const slot of extraSlots){
   const iso=parseSessionDate(slot?.day||'',slot?.time||'',now);
   const stamp=Date.parse(iso);
   if(stamp<=first||stamp>=end)throw Error('Os horários adicionais têm de ser posteriores ao primeiro jogo e nos sete dias seguintes.');
   if(unique.has(stamp))throw Error('Não podes repetir o mesmo dia e hora.');
   unique.add(stamp);
   additionalWeeklyGameDates.push(iso);
  }
  if(recurrenceOccurrences*(additionalWeeklyGameDates.length+1)>52)
   throw Error('O plano pode ter no máximo 52 sessões.');
  additionalWeeklyGameDates.sort((a,b)=>Date.parse(a)-Date.parse(b));
 }
 const seasonGame=input.seasonGame===true;
 if(seasonGame&&communityId===null)throw Error('Um jogo de época exige uma comunidade.');
 const confirmActivateRankings=input.confirmActivateRankings===true;
 if(!seasonGame&&confirmActivateRankings)throw Error('A ativação das classificações exige um jogo de época.');
 const rankingsEnabled=input.communityRankingsEnabled===true;
 if(seasonGame&&!rankingsEnabled&&!confirmActivateRankings)
  throw Error('Confirma a ativação das classificações para criar o jogo de época.');
 const privateGame=input.privateGame===true;
 const password=String(input.password||'').trim();
 if(privateGame&&password.length<4)throw Error('Uma sessão privada deve ter palavra-passe com pelo menos quatro caracteres.');
 const meetingPointInstructions=String(input.meetingPointInstructions||'').trim();
 if(meetingPointInstructions.length>240||/[\x00-\x1F\x7F]/.test(meetingPointInstructions))throw Error('O ponto de encontro deve ter uma única linha até 240 caracteres.');
 return {
  sport,gameDate,city,address,maxParticipants,
  priceAmount,privateGame,password:privateGame?password:null,latitude:null,longitude:null,
  communityId,venueId,recurrence,recurrenceOccurrences,
  externalConfirmedParticipants,registrationOpeningMode,registrationOpensAt,
  additionalWeeklyGameDates,recurrenceTimeZone,playFormat:null,communityShareIds:[],
  seasonCompetitionCommunityId:seasonGame?communityId:null,confirmActivateRankings:seasonGame&&!rankingsEnabled&&confirmActivateRankings,
  meetingPointInstructions:meetingPointInstructions||null,minParticipants
 };
}
module.exports={parseSessionDate,createSessionPayload};
