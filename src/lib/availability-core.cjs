'use strict';
const {tr}=require('./i18n-core.cjs');
// "Quem pode?": pure helpers for availability requests in groups and communities.

const MAX_SLOTS=5;
const MAX_NOTE=200;
const ANSWERS=Object.freeze([{value:'YES',label:'Posso'},{value:'MAYBE',label:'Talvez'},{value:'NO',label:'Não posso'}]);
const WEEKDAYS=['dia::dom','dia::seg','dia::ter','dia::qua','dia::qui','dia::sex','dia::sáb'];
const pad=n=>String(n).padStart(2,'0');

/** The next `count` local days as {value:'AAAA-MM-DD', label:'sáb 28/11'}; the first is "Hoje". */
function dayOptions(now=new Date(),count=21){
 const out=[];
 for(let i=0;i<count;i++){
  const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i);
  const value=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  out.push({value,label:i===0?tr('Hoje'):i===1?tr('Amanhã'):`${tr(WEEKDAYS[d.getDay()])} ${pad(d.getDate())}/${pad(d.getMonth()+1)}`});
 }
 return out;
}

/** Local day and HH:mm as an ISO instant, or an error message. */
function slotInstant(day,time,now=Date.now()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day||''))return{error:tr('Escolhe o dia.')};
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test((time||'').trim()))return{error:tr('Indica a hora no formato HH:mm.')};
 const local=new Date(day+'T'+time.trim()+':00');
 if(!Number.isFinite(local.getTime()))return{error:tr('Data inválida.')};
 if(local.getTime()<now+60*60000)return{error:tr('Escolhe uma hora daqui a pelo menos 1 hora.')};
 if(local.getTime()>now+60*86400000)return{error:tr('Escolhe uma data nos próximos 60 dias.')};
 return{iso:local.toISOString()};
}

function addSlot(slots,iso){
 if(slots.includes(iso))return{slots,error:tr('Essa opção já está na lista.')};
 if(slots.length>=MAX_SLOTS)return{slots,error:`No máximo ${MAX_SLOTS} opções.`};
 return{slots:[...slots,iso].sort(),error:''};
}

function slotLabel(iso,now=new Date()){
 const d=new Date(iso);
 if(!Number.isFinite(d.getTime()))return '';
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
 const day=new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
 const diff=Math.round((day-today)/86400000);
 const prefix=diff===0?tr('Hoje'):diff===1?tr('Amanhã'):`${tr(WEEKDAYS[d.getDay()])} ${pad(d.getDate())}/${pad(d.getMonth()+1)}`;
 return `${prefix} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Most "Posso", then most "Talvez", then earliest; null when nobody said yes or maybe. */
function bestSlot(request){
 if(!request||!Array.isArray(request.slots))return null;
 let best=null;
 for(const slot of request.slots){
  const yes=(slot.yes||[]).length,maybe=(slot.maybe||[]).length;
  if(yes+maybe===0)continue;
  if(!best||yes>best.yes||(yes===best.yes&&maybe>best.maybe))best={slot,yes,maybe};
 }
 return best?best.slot:null;
}

/** Params for /sessions/create from a slot (local day and time). */
function createParams(slot,extra={}){
 const d=new Date(slot.startsAt);
 return{...extra,day:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,time:`${pad(d.getHours())}:${pad(d.getMinutes())}`};
}

function progress(request){
 if(!request)return '';
 const others=Math.max(0,request.members);
 return `${request.answered} de ${others} ${others===1?'membro respondeu':'membros responderam'}`;
}

function validNote(note){return typeof note==='string'&&note.trim().length<=MAX_NOTE;}

module.exports={MAX_SLOTS,MAX_NOTE,ANSWERS,dayOptions,slotInstant,addSlot,slotLabel,bestSlot,createParams,progress,validNote};
