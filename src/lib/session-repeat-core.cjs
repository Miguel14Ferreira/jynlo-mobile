'use strict';
const {tr}=require('./i18n-core.cjs');
// "Jogar outra vez": a new session that copies a previous one, one week later
// (or the next same weekday in the future), with the same time and place.

const pad=n=>String(n).padStart(2,'0');

/** Next date on the same weekday and time as `iso` that is at least 1 hour from now (local time). */
function nextSameWeekday(iso,now=new Date()){
 const original=new Date(iso);
 if(Number.isNaN(original.getTime()))return null;
 const candidate=new Date(original.getTime());
 candidate.setDate(candidate.getDate()+7);
 while(candidate.getTime()<now.getTime()+60*60000)candidate.setDate(candidate.getDate()+7);
 return {day:`${candidate.getFullYear()}-${pad(candidate.getMonth()+1)}-${pad(candidate.getDate())}`,time:`${pad(candidate.getHours())}:${pad(candidate.getMinutes())}`};
}

/** Fields to copy into the creation form; never the password, the photo or the players. */
function repeatFormPatch(detail,now=new Date()){
 if(!detail||typeof detail!=='object')return null;
 const when=nextSameWeekday(detail.gameDate,now);
 if(!when)return null;
 const lat=typeof detail.pinLatitude==='number'?detail.pinLatitude:typeof detail.latitude==='number'?detail.latitude:null;
 const lng=typeof detail.pinLongitude==='number'?detail.pinLongitude:typeof detail.longitude==='number'?detail.longitude:null;
 const patch={sport:typeof detail.sport==='string'?detail.sport:'',day:when.day,time:when.time,
  city:typeof detail.city==='string'?detail.city:'',address:typeof detail.address==='string'?detail.address:''};
 if(lat!==null&&lng!==null){patch.latitude=lat;patch.longitude=lng;patch.locationConfirmed=true;}
 if(Number.isSafeInteger(detail.maxParticipants)&&detail.maxParticipants>0)patch.maxParticipants=String(detail.maxParticipants);
 if(Number.isSafeInteger(detail.minParticipants)&&detail.minParticipants>0)patch.minParticipants=String(detail.minParticipants);
 if(typeof detail.priceAmount==='number'&&detail.priceAmount>=0)patch.price=String(detail.priceAmount);
 if(typeof detail.meetingPointInstructions==='string')patch.meetingPointInstructions=detail.meetingPointInstructions;
 return patch;
}

/** Message after inviting last time's players. */
function repeatInviteMessage(summary){
 const invited=summary&&Number.isSafeInteger(summary.invited)?summary.invited:0;
 const skipped=summary&&Number.isSafeInteger(summary.skipped)?summary.skipped:0;
 if(!invited&&!skipped)return tr('O jogo foi criado. Não havia jogadores do jogo anterior para convidar.');
 const who=invited===1?tr('1 jogador da última vez foi convidado'):tr('{n} jogadores da última vez foram convidados',{n:invited});
 const extra=skipped?' '+tr('({n} já estavam inscritos ou não podiam ser convidados)',{n:skipped}):'';
 return tr('O jogo foi criado e {who}{extra}.',{who,extra});
}

module.exports={nextSameWeekday,repeatFormPatch,repeatInviteMessage};
