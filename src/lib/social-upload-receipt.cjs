'use strict';
// Server responses are authoritative only if the expected media references
// survived persistence. Never silently discard a composer on a partial 2xx.
const hasMedia=x=>typeof x==='string'&&x.trim().length>0;
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
 return reply.extraMedia.every((part,i)=>part&&typeof part==='object'&&hasMedia(part.url)&&
   part.mimeType===mediaTypes[i+1]);
}
module.exports={confirmedSocialMediaReceipt};
