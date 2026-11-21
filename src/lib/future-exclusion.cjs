'use strict';
/** Organizer-only, private and reversible: stops a player joining the organizer's future sessions. */
const REASONS=[
 {id:'NO_SHOW',label:'Falta registada'},
 {id:'UNSPORTING_CONDUCT',label:'Falta de fair play'},
 {id:'DISRESPECTFUL_BEHAVIOUR',label:'Comportamento desrespeitoso'},
 {id:'ABUSIVE_BEHAVIOUR',label:'Comportamento abusivo'},
 {id:'OTHER',label:'Outro motivo'}
];
/** "Falta registada" only when this game actually recorded a no-show (the server requires it). */
function reasonsFor(attendanceStatus){return REASONS.filter(r=>r.id!=='NO_SHOW'||attendanceStatus==='NO_SHOW');}
function canManage(viewer,creator,participantUsername){
 const v=String(viewer||'').toLowerCase(),c=String(creator||'').toLowerCase(),p=String(participantUsername||'').toLowerCase();
 return !!v&&!!p&&v===c&&p!==c;
}
module.exports={REASONS,reasonsFor,canManage};
