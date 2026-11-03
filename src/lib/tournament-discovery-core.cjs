'use strict';
/** Filters only tournaments already authorized by the backend. */
const STATUSES=Object.freeze([
 {value:'ALL',label:'Todos'},{value:'IN_PROGRESS',label:'A decorrer'},
 {value:'DRAFT',label:'Em preparação'},{value:'COMPLETED',label:'Concluídos'},
]);
const statusOrder={IN_PROGRESS:0,DRAFT:1,COMPLETED:2};
const icons={'Futebol':'⚽','Futsal':'⚽','Basquetebol':'🏀','Basquetebol 3x3':'🏀',
 'Voleibol':'🏐','Voleibol de Praia':'🏐','Andebol':'🤾','Karting':'🏎️',
 'Automobilismo':'🏁','Motociclismo':'🏍️','Natação':'🏊','Padel':'🎾',
 'Ténis':'🎾','Ténis de mesa':'🏓','Xadrez':'♟️','Golfe':'⛳',
 'Cricket':'🏏','Ciclismo':'🚴','Ciclismo de Estrada':'🚴',
 'Jiu-Jitsu':'🥋','Judo':'🥋','Boxe':'🥊','Esgrima':'🤺'};
function norm(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-PT').trim();}
function sportIcon(sport){return icons[String(sport??'')]||'🏆';}
function availableSports(entries){
 return Array.from(new Set((entries||[]).map(x=>String(x?.tournament?.sport||'').trim()).filter(Boolean)))
  .sort((a,b)=>a.localeCompare(b,'pt-PT',{sensitivity:'base'}));
}
function filterTournaments(entries,{query='',status='ALL',sport='ALL'}={}){
 const term=norm(query),selectedSport=norm(sport);
 return (entries||[]).filter(x=>{
  const t=x?.tournament;
  if(!t)return false;
  if(status!=='ALL'&&t.status!==status)return false;
  if(sport!=='ALL'&&norm(t.sport)!==selectedSport)return false;
  if(!term)return true;
  return [t.name,t.sport,x.communityName].some(value=>norm(value).includes(term));
 }).slice().sort((a,b)=>{
  const sa=statusOrder[a.tournament.status]??3,sb=statusOrder[b.tournament.status]??3;
  if(sa!==sb)return sa-sb;
  return String(a.tournament.name??'').localeCompare(String(b.tournament.name??''),'pt-PT',{sensitivity:'base'})
   ||a.communityId-b.communityId||a.tournament.id-b.tournament.id;
 });
}
module.exports={STATUSES,sportIcon,availableSports,filterTournaments};
