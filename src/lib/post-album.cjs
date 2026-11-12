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
function postMediaItems(item){
 const result=[];
 if(item.imageUrl)result.push({url:item.imageUrl,type:'image'});
 else if(item.videoUrl)result.push({url:item.videoUrl,type:'video'});
 for(const extra of item.extraMedia||[]){
  if(!extra?.url)continue;
  result.push({url:extra.url,type:extra.mimeType?.startsWith('video/')?'video':'image'});
 }
 return result;
}
module.exports={MAX_ALBUM_ITEMS,MAX_ALBUM_BYTES,albumError,mergeAlbum,postMediaItems};
