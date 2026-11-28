'use strict';
const {tr}=require('./i18n-core.cjs');
function formatLocalDateInput(value){
 const digits=String(value??'').replace(/\D/g,'').slice(0,8);
 if(digits.length<=4)return digits;
 if(digits.length<=6)return digits.slice(0,4)+'-'+digits.slice(4);
 return digits.slice(0,4)+'-'+digits.slice(4,6)+'-'+digits.slice(6);
}
function formatLocalTimeInput(value){
 const digits=String(value??'').replace(/\D/g,'').slice(0,4);
 return digits.length<=2?digits:digits.slice(0,2)+':'+digits.slice(2);
}
function parseSessionDate(day,time,now=Date.now()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(day).trim())||!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time).trim()))
  throw Error(tr('Indica uma data AAAA-MM-DD e uma hora HH:mm.'));
 const local=new Date(String(day).trim()+'T'+String(time).trim()+':00');
 if(!Number.isFinite(local.getTime())||
  local.getFullYear()!==Number(day.slice(0,4))||local.getMonth()+1!==Number(day.slice(5,7))||
  local.getDate()!==Number(day.slice(8,10))||
  local.getHours()!==Number(time.slice(0,2))||local.getMinutes()!==Number(time.slice(3,5)))
  throw Error(tr('Data ou hora inválida no fuso horário do telemóvel.'));
 if(local.getTime()<=now+5*60000)throw Error(tr('Escolhe um jogo futuro, com pelo menos cinco minutos de antecedência.'));
 return local.toISOString();
}
function validateWeeklySlots(day,time,slots,recurrence,occurrences,now=Date.now()){
 if(slots!=null&&!Array.isArray(slots))
  throw Error(tr('A lista de horários adicionais é inválida.'));
 const extraSlots=Array.isArray(slots)?slots:[];
 if(extraSlots.length>6)throw Error(tr('Escolhe no máximo sete jogos por semana.'));
 if(recurrence!=='WEEKLY'&&extraSlots.length>0)
  throw Error(tr('Horários adicionais só estão disponíveis com repetição semanal.'));
 const additionalWeeklyGameDates=[];
 if(extraSlots.length){
  const gameDate=parseSessionDate(day,time,now);
  const first=Date.parse(gameDate);
  const endOfWeek=new Date(day+'T'+time+':00');
  endOfWeek.setDate(endOfWeek.getDate()+7);
  const end=endOfWeek.getTime();
  const unique=new Set([first]);
  for(const slot of extraSlots){
   if(!slot||typeof slot!=='object'||Array.isArray(slot)||
      typeof slot.day!=='string'||typeof slot.time!=='string')
    throw Error(tr('Indica um dia e uma hora válidos para cada jogo adicional.'));
   const iso=parseSessionDate(slot.day,slot.time,now);
   const stamp=Date.parse(iso);
   if(stamp<=first||stamp>=end)throw Error(tr('Os horários adicionais têm de ser posteriores ao primeiro jogo e nos sete dias seguintes.'));
   if(unique.has(stamp))throw Error(tr('Não podes repetir o mesmo dia e hora.'));
   unique.add(stamp);
   additionalWeeklyGameDates.push(iso);
  }
  if(occurrences*(additionalWeeklyGameDates.length+1)>52)
   throw Error(tr('O plano pode ter no máximo 52 jogos.'));
  additionalWeeklyGameDates.sort((a,b)=>Date.parse(a)-Date.parse(b));
 }
 return additionalWeeklyGameDates;
}
function chooseVenueLocation(form,venue){
 if(!venue||!Number.isSafeInteger(venue.id)||venue.id<=0)throw Error(tr('Recinto inválido.'));
 return {...form,venueId:venue.id,city:String(venue.city||'').trim(),address:String(venue.address||'').trim()};
}
function detachVenueLocation(form){
 return {...form,venueId:null,city:'',address:''};
}
function changeCommunityMode(form,mode){
 if(!['INDEPENDENT','SINGLE','SHARED'].includes(mode))throw Error(tr('Tipo de jogo inválido.'));
 const cleared={...form,communityId:null,communityShareIds:[],seasonGame:false,
  communityRankingsEnabled:false,confirmActivateRankings:false,
  registrationOpeningMode:'IMMEDIATE',registrationDay:'',registrationTime:''};
 if(mode==='SHARED')return {...cleared,privateGame:false,password:''};
 return cleared;
}
function formatSessionLocalDateTime(iso){
 const date=new Date(iso);
 if(!Number.isFinite(date.getTime()))throw Error(tr('Data do jogo inválida.'));
 const pad=value=>String(value).padStart(2,'0');
 return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate())+
  ' '+pad(date.getHours())+':'+pad(date.getMinutes());
}
function describeSessionConfirmation(payload,context={}){
 const visibility=payload.communityShareIds.length?'Apenas membros das comunidades':
  payload.communityId!=null?tr('Apenas membros da comunidade'):
  payload.privateGame?tr('Só por convite'):tr('Pública');
 const communityNames=Array.isArray(context.sharedCommunityNames)?context.sharedCommunityNames:[];
 const parts=[
  payload.sport,
  payload.city,
  formatSessionLocalDateTime(payload.gameDate),
  tr('{n} participantes',{n:payload.maxParticipants}),
  visibility
 ];
 if(payload.communityShareIds.length)parts.push(tr('Partilhada com {who}',{who:communityNames.length?communityNames.join(', '):tr('{n} comunidades',{n:payload.communityShareIds.length})}));
 if(payload.communityId!=null)parts.push(context.communityName?tr('Comunidade {name}',{name:context.communityName}):tr('Comunidade selecionada'));
 if(payload.seasonCompetitionCommunityId!=null)parts.push(tr('Jogo de época')+(payload.confirmActivateRankings?' · '+tr('ativar classificações'):''));
 if(payload.venueId!=null)parts.push(context.venueName?tr('Recinto {name}',{name:context.venueName}):tr('Recinto selecionado'));
 if(payload.recurrence!=='NONE')parts.push(tr('{n} ciclos de repetição ({kind}), {slots} horários/ciclo',{n:payload.recurrenceOccurrences,kind:payload.recurrence==='WEEKLY'?tr('semanal'):tr('quinzenal'),slots:payload.additionalWeeklyGameDates.length+1}));
 parts.push(tr('{n} confirmados externos',{n:payload.externalConfirmedParticipants}));
 parts.push(payload.registrationOpeningMode==='MANUAL'?tr('Inscrições manuais'):payload.registrationOpeningMode==='SCHEDULED'?tr('Inscrições programadas'):tr('Inscrições imediatas'));
 return parts.join(' · ')+'. '+tr('O organizador fica automaticamente inscrito.');
}
function isValidCustomSport(name,allowedSports){
 if(typeof name!=='string'||name.length<2||name.length>60||
    name!==name.trim()||!/^[\p{L}\p{M}][\p{L}\p{M}\p{N} .&'’()/-]*$/u.test(name))
  return false;
 const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-PT');
 return !allowedSports.some(existing=>normalize(existing)===normalize(name));
}
function createSessionPayload(input,allowedSports,now=Date.now()){
 const sport=String(input.sport||'').trim().replace(/\s+/g,' ');
 if(!Array.isArray(allowedSports))throw Error(tr('Catálogo de modalidades indisponível.'));
 const customSport=!allowedSports.includes(sport);
 if(customSport&&!isValidCustomSport(sport,allowedSports))
  throw Error(tr('Indica uma modalidade válida ou escolhe uma existente do catálogo.'));
 const locationLatitude=input.latitude==null?null:Number(input.latitude);
 const locationLongitude=input.longitude==null?null:Number(input.longitude);
 const hasLatitude=locationLatitude!==null,hasLongitude=locationLongitude!==null;
 if(hasLatitude!==hasLongitude)throw Error(tr('O ponto no mapa deve ter latitude e longitude.'));
 if(hasLatitude&&(!Number.isFinite(locationLatitude)||Math.abs(locationLatitude)>90||
                  !Number.isFinite(locationLongitude)||Math.abs(locationLongitude)>180))
   throw Error(tr('O ponto GPS do jogo é inválido.'));
 if(hasLatitude&&input.locationConfirmed!==true)
   throw Error(tr('Confirma o ponto no mapa antes de criares o jogo.'));
 const venueId=input.venueId==null?null:Number(input.venueId);
 if(venueId!==null&&(!Number.isSafeInteger(venueId)||venueId<=0))throw Error(tr('Recinto inválido.'));
 const city=String(input.city||'').trim();
 if(city.length<2||city.length>120||!/^[\p{L}\p{M}][\p{L}\p{M}\d .,'’()/-]{1,119}$/u.test(city))throw Error('Indica uma localidade válida.');
 const address=String(input.address||'').trim();
 if(!address||address.length>500)throw Error(tr('Indica uma morada válida (até 500 caracteres).'));
 const maxText=String(input.maxParticipants||'').trim();
 if(!/^\d{1,3}$/.test(maxText))throw Error(tr('Número de participantes inválido.'));
 const maxParticipants=Number(maxText);
 if(maxParticipants<2||maxParticipants>100)throw Error(tr('O jogo deve permitir entre 2 e 100 participantes.'));
 const priceText=String(input.price||'0').trim().replace(',','.');
 if(!/^\d{1,6}(?:\.\d{1,2})?$/.test(priceText))throw Error(tr('Indica um preço válido, com até duas casas decimais.'));
 const priceAmount=Number(priceText);
 const externalText=String(input.externalConfirmedParticipants??'0').trim();
 if(!/^\d{1,2}$/.test(externalText))throw Error(tr('Indica quantos jogadores já tens confirmados.'));
 const externalConfirmedParticipants=Number(externalText);
 if(externalConfirmedParticipants>maxParticipants-1)throw Error(tr('Os jogadores externos não podem ocupar a vaga do organizador.'));
 const minText=String(input.minParticipants??'2').trim();
 if(!/^\d{1,3}$/.test(minText))throw Error(tr('Mínimo de participantes inválido.'));
 const minParticipants=Number(minText);
 if(minParticipants<2||minParticipants>maxParticipants)throw Error(tr('O mínimo deve estar entre 2 e a capacidade total.'));
 const communityId=input.communityId==null?null:Number(input.communityId);
 if(communityId!==null&&(!Number.isSafeInteger(communityId)||communityId<=0))throw Error(tr('Comunidade inválida.'));
 if(input.communityShareIds!=null&&!Array.isArray(input.communityShareIds))
  throw Error(tr('A lista de comunidades partilhadas é inválida.'));
 const shareIds=Array.isArray(input.communityShareIds)?input.communityShareIds:[];
 if(shareIds.length>5||shareIds.some(id=>!Number.isSafeInteger(id)||id<=0)||new Set(shareIds).size!==shareIds.length)
  throw Error(tr('Seleciona até cinco comunidades distintas e válidas.'));
 if(shareIds.length&&communityId!==null)
  throw Error(tr('Escolhe uma comunidade direta ou partilha entre comunidades, não ambas.'));
 const hasCommunity=communityId!==null||shareIds.length>0;
 if(customSport&&(hasCommunity||venueId!==null||input.seasonGame===true))
  throw Error(tr('Modalidades sugeridas só podem ser usadas em jogos independentes, sem recinto oficial ou classificação.'));
 const registrationOpeningMode=input.registrationOpeningMode??'IMMEDIATE';
 if(!['IMMEDIATE','MANUAL','SCHEDULED'].includes(registrationOpeningMode))
  throw Error(tr('Modo de abertura de inscrições inválido.'));
 if(!hasCommunity&&registrationOpeningMode!=='IMMEDIATE')throw Error(tr('Convocatórias manuais ou programadas exigem uma comunidade.'));
 const gameDate=parseSessionDate(input.day,input.time,now);
 let registrationOpensAt=null;
 if(registrationOpeningMode==='SCHEDULED'){
  registrationOpensAt=parseSessionDate(input.registrationDay||'',input.registrationTime||'',now);
  if(Date.parse(registrationOpensAt)>=Date.parse(gameDate))
   throw Error(tr('A abertura das inscrições deve anteceder o jogo.'));
 }
 const recurrence=input.recurrence??'NONE';
 if(!['NONE','WEEKLY','BIWEEKLY'].includes(recurrence))throw Error(tr('Repetição inválida.'));
 let recurrenceOccurrences=null,recurrenceTimeZone=null;
 if(recurrence!=='NONE'){
  const text=String(input.recurrenceOccurrences??'').trim();
  // Communities plan up to 52 games; independent organisers up to 12 (about three months).
  const maxSessions=hasCommunity?52:12;
  if(!/^[1-9][0-9]?$/.test(text)||Number(text)<2||Number(text)>maxSessions)
   throw Error(tr('Escolhe entre 2 e {n} repetições.',{n:maxSessions}));
  recurrenceOccurrences=Number(text);
  const perCycle=recurrence==='WEEKLY'&&Array.isArray(input.additionalWeeklySlots)?input.additionalWeeklySlots.length+1:1;
  if(recurrenceOccurrences*perCycle>maxSessions)
   throw Error(hasCommunity?tr('O plano pode ter no máximo {n} jogos.',{n:maxSessions}):tr('O plano pode ter no máximo {n} jogos sem comunidade.',{n:maxSessions}));
  const zone=String(input.recurrenceTimeZone||'').trim();
  if(!zone||zone.length>64)throw Error(tr('Não foi possível identificar o fuso horário para repetir jogos.'));
  try{new Intl.DateTimeFormat('en-US',{timeZone:zone});}
  catch{throw Error(tr('Fuso horário inválido para repetição de jogos.'));}
  recurrenceTimeZone=zone;
 }
 const additionalWeeklyGameDates=validateWeeklySlots(input.day,input.time,input.additionalWeeklySlots,recurrence,recurrenceOccurrences,now);
 const seasonGame=input.seasonGame===true;
 if(seasonGame&&shareIds.length)throw Error(tr('Os jogos de época neste formulário exigem uma comunidade direta.'));
 if(seasonGame&&communityId===null)throw Error(tr('Um jogo de época exige uma comunidade.'));
 const confirmActivateRankings=input.confirmActivateRankings===true;
 if(!seasonGame&&confirmActivateRankings)throw Error(tr('A ativação das classificações exige um jogo de época.'));
 const rankingsEnabled=input.communityRankingsEnabled===true;
 if(seasonGame&&!rankingsEnabled&&!confirmActivateRankings)
  throw Error(tr('Confirma a ativação das classificações para criar o jogo de época.'));
 const privateGame=input.privateGame===true;
 const password=String(input.password||'').trim();
 if(privateGame&&shareIds.length)throw Error(tr('Jogos partilhados não podem ser só por convite.'));
 // Private games are invite-only (link or direct invite); no password any more.
 const meetingPointInstructions=String(input.meetingPointInstructions||'').trim();
 if(meetingPointInstructions.length>240||/[\x00-\x1F\x7F]/.test(meetingPointInstructions))throw Error(tr('O ponto de encontro deve ter uma única linha até 240 caracteres.'));
 return {
  sport,gameDate,city,address,maxParticipants,
  priceAmount,privateGame,password:null,latitude:locationLatitude,longitude:locationLongitude,
  communityId,venueId,recurrence,recurrenceOccurrences,
  externalConfirmedParticipants,registrationOpeningMode,registrationOpensAt,
  additionalWeeklyGameDates,recurrenceTimeZone,playFormat:null,communityShareIds:shareIds.slice(),
  seasonCompetitionCommunityId:seasonGame?communityId:null,confirmActivateRankings:seasonGame&&!rankingsEnabled&&confirmActivateRankings,
  meetingPointInstructions:meetingPointInstructions||null,minParticipants,
  // Only sent when chosen, so "all levels" keeps the previous payload shape.
  ...(['BEGINNER','INTERMEDIATE','ADVANCED'].includes(input.skillLevel)?{skillLevel:input.skillLevel}:{})
 };
}
module.exports={formatLocalDateInput,formatLocalTimeInput,parseSessionDate,validateWeeklySlots,chooseVenueLocation,detachVenueLocation,changeCommunityMode,formatSessionLocalDateTime,describeSessionConfirmation,isValidCustomSport,createSessionPayload};
