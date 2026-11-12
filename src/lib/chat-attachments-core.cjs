'use strict';
const MAX_FILES=4,MAX_TOTAL_BYTES=40*1024*1024,MAX_PHOTO_BYTES=5*1024*1024;
const MIME=new Set(['image/jpeg','image/png','image/webp','image/gif']);
function validateChatAlbum(files,{allowUnknownSize=false}={}){
 if(!Array.isArray(files)||files.length===0||files.length>MAX_FILES)
  return 'Escolhe entre 1 e 4 fotografias.';
 let total=0;
 for(const item of files){
  if(!item||item.type!=='image'||typeof item.uri!=='string'||!item.uri)
   return 'Seleciona fotografias válidas.';
  if(!MIME.has(item.mimeType||''))
   return 'Formato não suportado. Escolhe JPG, PNG, WebP ou GIF.';
  if(item.fileSize!=null){
   if(!Number.isSafeInteger(item.fileSize)||item.fileSize<0||item.fileSize>MAX_PHOTO_BYTES)
    return 'Cada fotografia pode ter até 5 MB.';
   if(item.fileSize===0&&!allowUnknownSize)return 'Não foi possível confirmar o tamanho de uma fotografia.';
   total+=item.fileSize;
  }else if(!allowUnknownSize)return 'Não foi possível confirmar o tamanho de uma fotografia.';
 }
 return total>MAX_TOTAL_BYTES?'O conjunto não pode exceder 40 MB.':null;
}
function chatAttachmentList(message){
 if(!message||message.deletedAt)return [];
 const extras=Array.isArray(message.attachments)?message.attachments:[];
 if(extras.length){
  return extras.filter(file=>file&&Number.isSafeInteger(file.index)&&file.index>=0&&file.index<MAX_FILES&&
    typeof file.filename==='string'&&file.filename&&typeof file.mimeType==='string'&&file.mimeType&&
    Number.isSafeInteger(file.size)&&file.size>0&&file.size<=MAX_PHOTO_BYTES)
   .filter((file,i,list)=>list.findIndex(other=>other.index===file.index)===i)
   .sort((a,b)=>a.index-b.index)
   .map(file=>({index:file.index,name:file.filename,mime:file.mimeType,size:file.size}));
 }
 if(typeof message.attachmentName!=='string'||!message.attachmentName)return [];
 return [{index:0,name:message.attachmentName,mime:message.attachmentMimeType||null,
  size:message.attachmentSize??null}];
}
module.exports={MAX_FILES,MAX_TOTAL_BYTES,MAX_PHOTO_BYTES,validateChatAlbum,chatAttachmentList};
