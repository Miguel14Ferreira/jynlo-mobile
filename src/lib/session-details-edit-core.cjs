'use strict';

/** Validate the existing Jynlo /api/sessions/{id}/details contract. */
function asInt(value,label,min,max){
 const text=String(value??'').trim();
 if(!/^[0-9]+$/.test(text))throw Error(label+': indica um número inteiro.');
 const number=Number(text);
 if(!Number.isSafeInteger(number)||number<min||number>max)
  throw Error(label+': valor fora dos limites ('+min+'–'+max+').');
 return number;
}
function toDateTime(date,hour){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(hour))
  throw Error('Indica uma data e hora válidas.');
 const dt=new Date(date+'T'+hour+':00');
 if(!Number.isFinite(dt.getTime())||dt.getFullYear()!==Number(date.slice(0,4))||
    dt.getMonth()+1!==Number(date.slice(5,7))||dt.getDate()!==Number(date.slice(8,10))||
    dt.getHours()!==Number(hour.slice(0,2))||dt.getMinutes()!==Number(hour.slice(3,5)))
  throw Error('A data e hora não existem no calendário local.');
 return dt.toISOString();
}
function editSessionPayload(fields,allowedSports,now=Date.now()){
 const sport=String(fields.sport||'').trim();
 if(!allowedSports.includes(sport))throw Error('Escolhe uma modalidade válida do catálogo Jynlo.');
 const city=String(fields.city||'').trim(),address=String(fields.address||'').trim();
 if(city.length<2||city.length>120)throw Error('Indica uma cidade entre 2 e 120 caracteres.');
 if(address.length<1||address.length>500)throw Error('Indica uma morada até 500 caracteres.');
 const meeting=String(fields.meetingPointInstructions||'').trim();
 if(meeting.length>240||/[\r\n\x00-\x1f\x7f]/.test(meeting))
  throw Error('O ponto de encontro deve ter uma linha até 240 caracteres.');
 const maxParticipants=asInt(fields.maxParticipants,'Máximo de jogadores',2,100);
 const occupied=Number(fields.currentParticipantCount);
 const external=Number(fields.currentExternalConfirmedParticipants);
 if(fields.currentParticipantCount!=null&&Number.isSafeInteger(occupied)&&occupied>=0&&maxParticipants<occupied)
  throw Error('A capacidade não pode ser inferior ao número de jogadores já inscritos.');
 if(fields.currentExternalConfirmedParticipants!=null&&Number.isSafeInteger(external)&&external>=0&&maxParticipants<external+1)
  throw Error('A capacidade deve incluir os jogadores externos e a vaga do organizador.');
 const minParticipants=asInt(fields.minParticipants,'Mínimo de jogadores',2,maxParticipants);
 const priceText=String(fields.priceAmount??'').trim().replace(',','.');
 if(!/^\d+(\.\d{1,2})?$/.test(priceText))throw Error('Indica um preço válido até duas casas decimais.');
 const priceAmount=Number(priceText);
 if(!Number.isFinite(priceAmount)||priceAmount<0||priceAmount>100000)
  throw Error('O preço indicado não é válido.');
 const gameDate=toDateTime(String(fields.date||''),String(fields.hour||''));
 if(Date.parse(gameDate)<=now)throw Error('A data e hora devem ser futuras.');
 return {sport,gameDate,maxParticipants,minParticipants,priceAmount,city,address,meetingPointInstructions:meeting||null};
}
module.exports={editSessionPayload,toDateTime};
