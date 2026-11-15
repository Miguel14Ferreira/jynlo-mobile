'use strict';
// Server responses are authoritative only if the expected media references
// survived persistence. Never silently discard a composer on a partial 2xx.
const hasMedia=x=>{
 if(typeof x!=='string')return false;
 const path=x.trim();
 if(!path||path.length>2048||/[\\\x00-\x1f\x7f]/.test(path)||path.startsWith('//'))return false;
 // Backend-owned relative resources and HTTPS object storage are allowed.
 // Never confirm a social upload pointing to an executable/non-HTTPS scheme.
 if(/^https:\/\//i.test(path))return /^https:\/\/[^/@\\s?#]+(?:[/?#]|$)/i.test(path);
 if(path.startsWith('/'))return true;
 return /^[a-z0-9][a-z0-9._/~?&=%-]*$/i.test(path)&&
   !path.split(/[/?]/).includes('..');
};
function confirmedSocialMediaReceipt(reply,mediaTypes,isStory){
 if(!reply||typeof reply!=='object'||!Array.isArray(mediaTypes)||
    mediaTypes.length<1||mediaTypes.length>(isStory?1:6)||
    mediaTypes.some(type=>typeof type!=='string'||
      !['image/jpeg','image/png','image/webp','video/mp4','video/webm'].includes(type)))return false;
 const id=isStory?reply.id:reply.postId;
 if(!Number.isSafeInteger(id)||id<=0)return false;
 if(isStory)return hasMedia(reply.mediaUrl)&&
   Boolean(reply.video)===mediaTypes[0].startsWith('video/');
 const first=mediaTypes[0].startsWith('video/')?reply.videoUrl:reply.imageUrl;
 if(!hasMedia(first))return false;
 if(mediaTypes.length===1)return true;
 if(!Array.isArray(reply.extraMedia)||reply.extraMedia.length!==mediaTypes.length-1)return false;
 const urls=new Set([first.trim()]);
 return reply.extraMedia.every((part,i)=>{
   if(!part||typeof part!=='object'||!hasMedia(part.url)||part.mimeType!==mediaTypes[i+1])return false;
   const url=part.url.trim();
   // The feed deduplicates media URLs. Never confirm a six-file upload if a
   // malformed 2xx response points two different files at the same resource.
   if(urls.has(url))return false;
   urls.add(url);
   return true;
 });
}
module.exports={confirmedSocialMediaReceipt};
