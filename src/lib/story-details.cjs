'use strict';
/** Matches backend Story limits, never silently drop invalid usernames. */
function prepareStoryDetails(location,tags){
 const label=typeof location==='string'?location.trim():'';
 if(label.length>160||/[\u0000-\u001f\u007f]/.test(label))throw Error('A localização da Story deve ter até 160 caracteres, numa única linha.');
 if(typeof tags!=='string')throw Error('Identificações inválidas.');
 const entries=tags.split(',').map(x=>x.trim()).filter(Boolean);
 if(entries.length>5)throw Error('Podes identificar no máximo 5 perfis.');
 const normalized=[],seen=new Set();
 for(const tag of entries){
  const name=tag.replace(/^@/,'').toLowerCase();
  if(!/^[a-z0-9_.-]{2,45}$/.test(name))throw Error('Utiliza nomes de perfil válidos, separados por vírgulas.');
  if(seen.has(name))throw Error('Não repitas a mesma identificação.');
  seen.add(name);normalized.push(name);
 }
 return {locationLabel:label,taggedUsernames:normalized.join(',')};
}
module.exports={prepareStoryDetails};
