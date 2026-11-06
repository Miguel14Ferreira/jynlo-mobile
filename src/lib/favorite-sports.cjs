'use strict';

/** Names come from SportsCatalog.ALLOWED on the backend; never invent local labels. */
function parseFavoriteSports(value){
 if(typeof value!=='string'||!value.trim())return [];
 return [...new Set(value.split(',').map(s=>s.trim()).filter(Boolean))];
}
function normalizeCatalog(response){
 if(!Array.isArray(response)||!response.length||response.some(x=>typeof x!=='string'||!x.trim()))
  throw new Error('O catálogo de modalidades não está disponível.');
 return [...new Set(response.map(x=>x.trim()))].sort((a,b)=>a.localeCompare(b,'pt'));
}
function toggleFavoriteSport(current,sport,catalog){
 if(!catalog.includes(sport))throw new Error('Modalidade desconhecida.');
 const existing=parseFavoriteSports(current);
 const updated=existing.includes(sport)?existing.filter(s=>s!==sport):[...existing,sport];
 if(updated.join(',').length>255)throw new Error('Selecionaste demasiadas modalidades (máximo 255 caracteres).');
 return updated.join(',');
}
function validateFavoriteSports(current,catalog){
 const chosen=parseFavoriteSports(current);
 if(!Array.isArray(catalog)||!catalog.length)return 'Não foi possível validar o catálogo de modalidades.';
 if(chosen.some(s=>!catalog.includes(s)))return 'Remove modalidades antigas que já não fazem parte do catálogo.';
 if(chosen.join(',').length>255)return 'Selecionaste demasiadas modalidades.';
 return null;
}
function filterSports(catalog,search){
 const q=(search||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-PT');
 return catalog.filter(s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-PT').includes(q));
}
module.exports={parseFavoriteSports,normalizeCatalog,toggleFavoriteSport,validateFavoriteSports,filterSports};
