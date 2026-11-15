'use strict';

/** Validate the structure needed to render social API responses.
 * Never silently turn a broken API response into an apparently empty feed:
 * callers retain their last confirmed state and display a refresh warning.
 */
function requireSocialCollection(raw,kind){
 if(!['feed','story','comment','reply'].includes(kind)||!Array.isArray(raw))
  throw Error('Resposta de conteúdo social inválida.');
 for(const item of raw){
  if(!item||typeof item!=='object'||Array.isArray(item))
   throw Error('O servidor devolveu um elemento social inválido.');
  if(kind==='story'){
   if(!Number.isSafeInteger(item.id)||item.id<=0||typeof item.authorUsername!=='string'||
      !item.authorUsername.trim()||typeof item.mediaUrl!=='string'||!item.mediaUrl.trim()||
      typeof item.expiresAt!=='string'||!Number.isFinite(Date.parse(item.expiresAt)))
    throw Error('O servidor devolveu uma Story inválida.');
  }else if(kind==='feed'){
   if(!['POST','SESSION_CREATED','SESSION_ATTENDED'].includes(item.type)||
      typeof item.authorUsername!=='string'||!item.authorUsername.trim()||
      typeof item.createdAt!=='string'||!Number.isFinite(Date.parse(item.createdAt))||
      (item.postId!==null&&(!Number.isSafeInteger(item.postId)||item.postId<=0)))
    throw Error('O servidor devolveu uma publicação inválida.');
  }else if(kind==='reply'){
   if(!Number.isSafeInteger(item.id)||item.id<=0||
      !Number.isSafeInteger(item.storyId)||item.storyId<=0||
      typeof item.senderUsername!=='string'||!item.senderUsername.trim()||
      typeof item.content!=='string'||
      typeof item.createdAt!=='string'||!Number.isFinite(Date.parse(item.createdAt)))
    throw Error('O servidor devolveu uma resposta privada inválida.');
  }else if(kind==='comment'){
   if(!Number.isSafeInteger(item.id)||item.id<=0||
      typeof item.authorUsername!=='string'||!item.authorUsername.trim()||
      typeof item.content!=='string')
    throw Error('O servidor devolveu um comentário inválido.');
  }else throw Error('Tipo de conteúdo social inválido.');
 }
 return raw;
}

/** The discovery endpoint is not a trusted display or navigation source. */
function safeDiscoveredPeople(raw,limit=12){
 if(!Array.isArray(raw))throw Error('Resposta de descoberta de pessoas inválida.');
 const result=[],seen=new Set();
 for(const person of raw){
  if(!person||typeof person!=='object'||Array.isArray(person))continue;
  if(typeof person.username!=='string')continue;
  const username=person.username.trim();
  if(!/^[a-zA-Z0-9_.@-]{1,128}$/.test(username)||seen.has(username.toLowerCase()))continue;
  seen.add(username.toLowerCase());
  const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
  const displayName=text(person.nickname,100)||text(person.fullName,100)||username;
  const photo=person.profilePicUrl??person.photoUrl;
  const photoUrl=typeof photo==='string'&&photo.length<=2048&&
    (/^https:\/\//i.test(photo)||/^\/api\//.test(photo))?photo:null;
  result.push({username,displayName,photoUrl,
   sport:text(person.sport,100)||null,
   city:text(person.location,120)||text(person.city,120)||null});
  if(result.length>=limit)break;
 }
 return result;
}
module.exports={requireSocialCollection,safeDiscoveredPeople};
