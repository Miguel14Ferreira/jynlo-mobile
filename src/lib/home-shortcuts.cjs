'use strict';
/** Every shortcut a person can pin on Início; "my-venues" and "book-court" only when they apply. */
const SHORTCUT_CATALOG=[
 {id:'create',label:'Criar jogo',icon:'plus',href:'/sessions/create'},
 {id:'my-games',label:'Os meus jogos',icon:'session',href:'/my-sessions'},
 {id:'games',label:'Encontrar jogos',icon:'explore',href:'/explore'},
 {id:'communities',label:'Comunidades',icon:'community',href:'/communities'},
 {id:'tournaments',label:'Torneios',icon:'tournament',href:'/tournaments'},
 {id:'teams',label:'Equipas',icon:'championship',href:'/teams'},
 {id:'messages',label:'Mensagens',icon:'messages',href:'/messages'},
 {id:'venues',label:'Recintos',icon:'venue',href:'/venues'},
 {id:'people',label:'Pessoas',icon:'profile',href:'/people'},
 {id:'my-bookings',label:'As minhas reservas',icon:'calendar',href:'/venue-bookings'},
 {id:'book-court',label:'Reservar campo',icon:'calendar',href:'/book-court'},
 {id:'my-venues',label:'Os meus recintos',icon:'venue',href:'/venue-bookings'},
];
const DEFAULT_SHORTCUTS=['create','my-games','communities','tournaments'];
const MAX_SHORTCUTS=6;

/** The ids that apply to this person right now. */
function availableShortcutIds(manager,bookingsOpen){
 return SHORTCUT_CATALOG.filter(s=>(s.id!=='my-venues'||manager)&&(s.id!=='book-court'||bookingsOpen)).map(s=>s.id);
}

/** Pinned ids in order: saved choice when there is one, else the defaults (managers get their venues first). */
function resolveShortcuts(saved,available,manager){
 const set=new Set(available);
 const valid=ids=>ids.filter((id,i)=>typeof id==='string'&&set.has(id)&&ids.indexOf(id)===i).slice(0,MAX_SHORTCUTS);
 if(Array.isArray(saved))return valid(saved);
 return valid(manager?['my-venues',...DEFAULT_SHORTCUTS]:DEFAULT_SHORTCUTS);
}

function moveShortcut(ids,index,step){
 const j=index+step;
 if(index<0||index>=ids.length||j<0||j>=ids.length)return ids.slice();
 const next=ids.slice();[next[index],next[j]]=[next[j],next[index]];return next;
}

module.exports={SHORTCUT_CATALOG,DEFAULT_SHORTCUTS,MAX_SHORTCUTS,availableShortcutIds,resolveShortcuts,moveShortcut};
