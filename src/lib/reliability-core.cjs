'use strict';
const {tr}=require('./i18n-core.cjs');
/** Attendance history and disputes — same rules and wording as the web "Minhas sessões" page. */
const ATTENDANCE_LABELS={ATTENDED:'Presente',NO_SHOW:'Faltou',LATE_CANCELLED:'Cancelamento tardio',PENDING:'Pendente'};
const DISPUTE_LABELS={OPEN:'Em análise',ACCEPTED:'Aceite',REJECTED:'Rejeitada'};
const MAX_REASON=2000;
function attendanceLabel(status){return ATTENDANCE_LABELS[status]||ATTENDANCE_LABELS.PENDING;}
function disputeLabel(status){return status?DISPUTE_LABELS[status]||null:null;}
/** Sessions the user organises are left out, as on the web (the organiser marks the others). */
function externalHistory(items,ownedSessionIds){
 const owned=new Set((ownedSessionIds||[]).map(Number));
 return (Array.isArray(items)?items:[]).filter(i=>i&&!owned.has(Number(i.sessionId)))
  .sort((a,b)=>(Date.parse(b.gameDate)||0)-(Date.parse(a.gameDate)||0));
}
function validateDisputeReason(reason){
 const text=String(reason||'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').trim();
 if(!text)throw new Error(tr('Explica por que motivo queres contestar esta falta.'));
 if(text.length>MAX_REASON)throw new Error(tr('A justificação não pode ter mais de 2000 caracteres.'));
 return text;
}
/** After a successful dispute the item shows "Em análise" and can't be disputed again. */
function markDisputed(items,participantId){
 return items.map(i=>i.participantId===participantId?{...i,disputeStatus:'OPEN',canDispute:false}:i);
}
function formatRate(rate){
 const n=Number(rate);if(!Number.isFinite(n))return '—';
 return Math.round(Math.min(100,Math.max(0,n)))+'%';
}
module.exports={ATTENDANCE_LABELS,DISPUTE_LABELS,MAX_REASON,attendanceLabel,disputeLabel,externalHistory,validateDisputeReason,markDisputed,formatRate};
