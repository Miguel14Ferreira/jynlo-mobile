'use strict';
const MAX_ALBUM_ITEMS=6,MAX_ALBUM_BYTES=60*1024*1024;
function albumError(files,allowUnknownSize=false){
 if(!Array.isArray(files)||files.length<1||files.length>MAX_ALBUM_ITEMS)
  return 'Escolhe entre 1 e 6 fotografias ou vídeos.';
 let total=0;
 for(const file of files){
  if(!file||!['image','video'].includes(file.type)||typeof file.uri!=='string'||!file.uri)
   return 'Um dos ficheiros selecionados é inválido.';
  if(!Number.isFinite(file.fileSize)||file.fileSize<0||(!allowUnknownSize&&file.fileSize===0))
   return 'Não foi possível confirmar o tamanho de um ficheiro.';
  const {validateMedia}=require('./social-feed-core.cjs');
  if(typeof file.mimeType!=='string'||!['image/jpeg','image/png','image/webp','video/mp4','video/webm'].includes(file.mimeType)||
    (file.type==='video')!==file.mimeType.startsWith('video/'))
   return 'O formato do ficheiro não corresponde ao tipo de fotografia ou vídeo.';
  const error=file.fileSize===0&&allowUnknownSize?null:validateMedia(file.mimeType,file.fileSize,false);
  if(error)return error;
  total+=file.fileSize;
 }
 return total>MAX_ALBUM_BYTES?'O álbum não pode exceder 60 MB no total.':null;
}
function mergeAlbum(existing,incoming){
 const result=[...(existing||[])];
 for(const file of incoming||[]){
  if(!result.some(old=>old.uri===file.uri))result.push(file);
 }
 return result;
}
/** Render only bounded, supported media from backend or archived posts. */
function postMediaItems(item){
 if(!item||typeof item!=='object')return [];
 const result=[],seen=new Set();
 const put=(url,type)=>{
  if(typeof url!=='string'||!url.trim()||seen.has(url)||result.length>=MAX_ALBUM_ITEMS)return;
  seen.add(url);result.push({url,type});
 };
 if(typeof item.imageUrl==='string'&&item.imageUrl.trim())put(item.imageUrl,'image');
 else if(typeof item.videoUrl==='string'&&item.videoUrl.trim())put(item.videoUrl,'video');
 if(Array.isArray(item.extraMedia)){
  for(const extra of item.extraMedia.slice(0,MAX_ALBUM_ITEMS*2)){
   if(!extra||typeof extra!=='object')continue;
   if(['image/jpeg','image/png','image/webp'].includes(extra.mimeType))put(extra.url,'image');
   else if(['video/mp4','video/webm'].includes(extra.mimeType))put(extra.url,'video');
  }
 }
 return result;
}
module.exports={MAX_ALBUM_ITEMS,MAX_ALBUM_BYTES,albumError,mergeAlbum,postMediaItems};
