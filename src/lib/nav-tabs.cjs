'use strict';
/**
 * The bottom bar each person arranges: Início, Criar and Perfil stay; the two slots
 * (where Explorar and Mensagens start) show the sections the person picked.
 */
const NAV_TAB_CATALOG=[
 {id:'explore',label:'Explorar',icon:'explore',href:'/(tabs)/explore'},
 {id:'messages',label:'Mensagens',icon:'messages',href:'/(tabs)/messages'},
 {id:'my-games',label:'Os meus jogos',icon:'session',href:'/my-sessions'},
 {id:'communities',label:'Comunidades',icon:'community',href:'/communities'},
 {id:'teams',label:'Equipas',icon:'championship',href:'/teams'},
 {id:'tournaments',label:'Torneios',icon:'tournament',href:'/tournaments'},
 {id:'venues',label:'Recintos',icon:'venue',href:'/venues'},
 {id:'notifications',label:'Notificações',icon:'notifications',href:'/notifications'},
 {id:'my-bookings',label:'As minhas reservas',icon:'calendar',href:'/venue-bookings'},
 {id:'my-venues',label:'Os meus recintos',icon:'venue',href:'/venue-bookings',managerOnly:true},
];
const NAV_SLOTS=2;
const DEFAULT_NAV_TABS=['explore','messages'];

function availableNavTabs(manager){return NAV_TAB_CATALOG.filter(tab=>!tab.managerOnly||manager);}

/** Exactly NAV_SLOTS ids, no repeats: the saved choice where valid, gaps filled from the defaults. */
function resolveNavTabs(saved,manager){
 const allowed=new Set(availableNavTabs(manager).map(tab=>tab.id));
 const picked=[];
 const take=id=>{if(typeof id==='string'&&allowed.has(id)&&!picked.includes(id)&&picked.length<NAV_SLOTS)picked.push(id);};
 if(Array.isArray(saved))saved.forEach(take);
 DEFAULT_NAV_TABS.forEach(take);
 NAV_TAB_CATALOG.forEach(tab=>take(tab.id));
 return picked;
}

/** Puts id in slot; if it was already in the other slot the two swap. */
function setNavSlot(ids,slot,id){
 const next=ids.slice();
 if(slot<0||slot>=next.length)return next;
 const from=next.indexOf(id);
 if(from>=0)next[from]=next[slot];
 next[slot]=id;
 return next;
}

module.exports={NAV_TAB_CATALOG,NAV_SLOTS,DEFAULT_NAV_TABS,availableNavTabs,resolveNavTabs,setNavSlot};
