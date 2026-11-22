'use strict';
const {tr}=require('./i18n-core.cjs');
/** Organizer-only, private and reversible: stops a player joining the organizer's future sessions. */
const REASONS=[
 {id:'NO_SHOW',label:tr('Falta registada')},
 {id:'UNSPORTING_CONDUCT',label:tr('Falta de fair play')},
 {id:'DISRESPECTFUL_BEHAVIOUR',label:tr('Comportamento desrespeitoso')},
 {id:'ABUSIVE_BEHAVIOUR',label:tr('Comportamento abusivo')},
 {id:'OTHER',label:tr('Outro motivo')}
];
/** "Falta registada" only when this game actually recorded a no-show (the server requires it). */
function reasonsFor(attendanceStatus){return REASONS.filter(r=>r.id!=='NO_SHOW'||attendanceStatus==='NO_SHOW');}
function canManage(viewer,creator,participantUsername){
 const v=String(viewer||'').toLowerCase(),c=String(creator||'').toLowerCase(),p=String(participantUsername||'').toLowerCase();
 return !!v&&!!p&&v===c&&p!==c;
}
module.exports={REASONS,reasonsFor,canManage};
