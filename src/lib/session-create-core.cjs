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
 const privateGame=input.privateGame===true;
 const password=String(input.password||'').trim();
 if(privateGame&&password.length<4)throw Error('Uma sessão privada deve ter palavra-passe com pelo menos quatro caracteres.');
 const meetingPointInstructions=String(input.meetingPointInstructions||'').trim();
 if(meetingPointInstructions.length>240||/[\x00-\x1F\x7F]/.test(meetingPointInstructions))throw Error('O ponto de encontro deve ter uma única linha até 240 caracteres.');
 return {
  sport,gameDate:parseSessionDate(input.day,input.time,now),city,address,maxParticipants,
  priceAmount,privateGame,password:privateGame?password:null,latitude:null,longitude:null,
  communityId:null,venueId:null,recurrence:'NONE',recurrenceOccurrences:null,
  externalConfirmedParticipants:0,registrationOpeningMode:'IMMEDIATE',registrationOpensAt:null,
  additionalWeeklyGameDates:[],recurrenceTimeZone:null,playFormat:null,communityShareIds:[],
  seasonCompetitionCommunityId:null,confirmActivateRankings:false,
  meetingPointInstructions:meetingPointInstructions||null,minParticipants:null
 };
}
module.exports={parseSessionDate,createSessionPayload};
