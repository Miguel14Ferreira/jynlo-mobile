'use strict';
const imageTypes=new Set(['image/jpeg','image/png','image/webp']);
const videoTypes=new Set(['video/mp4','video/webm']);
function mediaKind(type){if(imageTypes.has(type))return 'image';if(videoTypes.has(type))return 'video';return null;}
function validateMedia(type,size,forStory=false){
  const kind=mediaKind(type);
  if(!kind)return 'Formato não suportado. Usa JPG, PNG, WEBP, MP4 ou WEBM.';
  const max=kind==='image'?5*1024*1024:20*1024*1024;
  if(!Number.isFinite(size)||size<=0||size>max)return `O ficheiro excede o limite de ${kind==='image'?5:20} MB.`;
  return null;
}
function groupStories(mine,entries,at=Date.now()){
  const seen=new Set(),groups=new Map();
  for(const story of [...(mine||[]),...(entries||[])]){
    if(!story||!Number.isSafeInteger(story.id)||seen.has(story.id))continue;
    // A malformed API entry must not crash the entire feed or remain visible
    // forever because Date.parse returned NaN.
    const expiry=Date.parse(story.expiresAt||'');
    if(!Number.isFinite(expiry)||expiry<=at)continue;
    if(story.communityId==null&&(typeof story.authorUsername!=='string'||!story.authorUsername.trim()))continue;
    seen.add(story.id);
    const key=story.communityId!=null?`community:${story.communityId}`:`person:${story.authorUsername.toLowerCase()}`;
    if(!groups.has(key))groups.set(key,{key,name:story.communityId!=null?(story.communityName||story.displayName):`@${story.authorUsername.replace(/^@/,'')}`,avatar:story.communityPhotoUrl||story.avatarUrl,stories:[]});
    groups.get(key).stories.push(story);
  }
  return [...groups.values()].map(group=>({...group,stories:group.stories.sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt))}));
}
function upcoming(s,at=Date.now()){
  const time=Date.parse(s?.gameDate||'');return (s?.status==='OPEN'||s?.status==='FULL')&&Number.isFinite(time)&&time>at;
}
function futureWeek(s,at=Date.now()){
  return upcoming(s,at) && Date.parse(s.gameDate)<=at+7*24*60*60*1000;
}
function uniqueSessions(created=[],joined=[]){const owned=new Set(created.map(x=>x.id));return [...created,...joined.filter(x=>!owned.has(x.id))];}
function mediaUrl(base,url){if(!url)return null;if(/^https:\/\//i.test(url)||/^data:image\//i.test(url))return url;if(/^http:\/\//i.test(url))return null;return `${base}${url.startsWith('/')?'':'/'}${url}`;}
module.exports={mediaKind,validateMedia,groupStories,upcoming,futureWeek,uniqueSessions,mediaUrl};
