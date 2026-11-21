'use strict';
// Global search: one box for people, communities, teams, venues and games.

const key=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();

/** Games are searched by sport when the text names one, otherwise by city. */
function sessionFilters(query,sports){
 const q=key(query);
 if(q.length<2)return null;
 const sport=(sports||[]).find(s=>key(s)===q)||null;
 return sport?{sport}:{city:query.trim()};
}

function cleanQuery(query){
 const q=String(query||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim();
 return q.length>=2?q.slice(0,80):'';
}

/** At most `limit` items per section; total count for the "nothing found" message. */
function sections(results,limit=5){
 const out={};let total=0;
 for(const [name,items] of Object.entries(results||{})){
  const list=Array.isArray(items)?items.slice(0,limit):[];
  out[name]=list;total+=list.length;
 }
 return {sections:out,total};
}

module.exports={sessionFilters,cleanQuery,sections};
