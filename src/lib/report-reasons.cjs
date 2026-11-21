'use strict';
/** Report categories shown to users; the server receives "Categoria: detalhe". */
const REPORT_REASONS=[
 {id:'SPAM',label:'Spam ou publicidade'},
 {id:'HARASSMENT',label:'Assédio, ódio ou ameaças'},
 {id:'EXPLICIT',label:'Conteúdo sexual ou violento'},
 {id:'FALSE',label:'Informação falsa ou fraude'},
 {id:'OTHER',label:'Outro motivo'}
];
function composeReportReason(reasonId,details){
 const reason=REPORT_REASONS.find(r=>r.id===reasonId);
 if(!reason)throw Error('Escolhe o motivo da denúncia.');
 const extra=String(details||'').replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,800);
 if(reason.id==='OTHER'&&!extra)throw Error('Explica brevemente o motivo.');
 return extra?reason.label+': '+extra:reason.label;
}
module.exports={REPORT_REASONS,composeReportReason};
