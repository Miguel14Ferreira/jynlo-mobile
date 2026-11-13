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
function storyMentionUsernames(value){
 if(typeof value!=='string')return [];
 const seen=new Set(),result=[];
 for(const tag of value.split(',')){
  const name=tag.trim().replace(/^@/,'').toLowerCase();
  if(!/^[a-z0-9_.-]{2,45}$/.test(name)||seen.has(name))continue;
  seen.add(name);result.push(name);
  if(result.length===5)break;
 }
 return result;
}
function toggleStoryMention(current,username){
 const name=typeof username==='string'?username.trim().toLowerCase():'';
 if(!/^[a-z0-9_.-]{2,45}$/.test(name))throw Error('Perfil inválido.');
 const users=storyMentionUsernames(current);
 const next=users.includes(name)?users.filter(x=>x!==name):[...users,name];
 if(next.length>5)throw Error('Podes identificar no máximo 5 amigos.');
 return next.join(',');
}
module.exports={prepareStoryDetails,storyMentionUsernames,toggleStoryMention};
