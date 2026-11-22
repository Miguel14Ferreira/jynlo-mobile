'use strict';
// First steps after signing up: pick sports and city.

const POPULAR=['Futebol','Padel','Ténis','Corrida','Basquetebol','Voleibol','Futsal','Ciclismo','Ginásio','Natação','Caminhada','Andebol'];
const MAX_SPORTS=10;
const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();

/** Popular sports first (only those in the catalog), then the rest, filtered by the typed text. */
function sportChoices(catalog,filter,selected){
 const all=Array.from(new Set(catalog||[]));
 const popular=POPULAR.filter(s=>all.includes(s));
 const rest=all.filter(s=>!popular.includes(s)).sort((a,b)=>a.localeCompare(b,'pt'));
 const q=fold(filter);
 const ordered=q?[...popular,...rest].filter(s=>fold(s).includes(q)):popular;
 const chosen=(selected||[]).filter(s=>!ordered.includes(s));
 return [...chosen,...ordered];
}

function toggleSport(selected,sport){
 const list=Array.isArray(selected)?selected:[];
 if(list.includes(sport))return list.filter(s=>s!==sport);
 if(list.length>=MAX_SPORTS)return list;
 return [...list,sport];
}

/** Offer once per account: only when nothing chosen yet and the person did not skip. */
function shouldOffer(state,skipped){
 return Boolean(state&&state.needed&&!skipped);
}

function skipFileName(username){
 return 'first-steps-'+String(username||'').toLowerCase().replace(/[^a-z0-9._-]/g,'_')+'.txt';
}

/**
 * Public communities for the chosen sports (one result list per sport), without
 * the ones the person already belongs to, interleaved so every sport shows up.
 */
function suggestedCommunities(lists,memberIds,limit){
 const mine=new Set((memberIds||[]).map(Number));
 const seen=new Set(),out=[];
 const queues=(lists||[]).map(list=>(Array.isArray(list)?list:[]).filter(group=>group&&group.visibility==='PUBLIC'
  &&Number.isSafeInteger(group.id)&&group.id>0&&!mine.has(group.id)));
 for(let round=0;out.length<limit&&queues.some(queue=>queue.length>round);round++){
  for(const queue of queues){
   const group=queue[round];
   if(group&&!seen.has(group.id)&&out.length<limit){seen.add(group.id);out.push(group);}
  }
 }
 return out;
}

module.exports={POPULAR,MAX_SPORTS,sportChoices,toggleSport,shouldOffer,skipFileName,suggestedCommunities};
