'use strict';
const {tr}=require('./i18n-core.cjs');
const {communitySports}=require('./community-core.cjs');

/** Only sports present in every target community may be shared. */
function availableSessionSports(groups,catalog){
 if(!Array.isArray(catalog))throw Error(tr('Catálogo de modalidades inválido.'));
 if(!Array.isArray(groups)||groups.length===0)return [...catalog];
 return catalog.filter(sport=>groups.every(group=>communitySports(group).includes(sport)));
}
module.exports={availableSessionSports};
