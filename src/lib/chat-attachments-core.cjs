'use strict';
const MAX_FILES=4,MAX_TOTAL_BYTES=40*1024*1024,MAX_PHOTO_BYTES=5*1024*1024,MAX_VIDEO_BYTES=20*1024*1024;
const MIME=new Set(['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']);
function validateChatAlbum(files,{allowUnknownSize=false}={}){
 if(!Array.isArray(files)||files.length===0||files.length>MAX_FILES)
  return 'Escolhe entre 1 e 4 fotografias ou vídeos.';
 let total=0;
 for(const item of files){
  if(!item||(item.type!=='image'&&item.type!=='video')||typeof item.uri!=='string'||!item.uri)
   return 'Seleciona fotografias ou vídeos válidos.';
  const mime=item.mimeType||'';
  if(!MIME.has(mime)||((item.type==='video')!==mime.startsWith('video/')))
   return 'Formato não suportado. Usa JPG, PNG, WebP, GIF, MP4 ou WebM.';
  const max=mime.startsWith('video/')?MAX_VIDEO_BYTES:MAX_PHOTO_BYTES;
  if(item.fileSize!=null){
   if(!Number.isSafeInteger(item.fileSize)||item.fileSize<0||item.fileSize>max)
    return 'O ficheiro excede o limite permitido ('+(max/1024/1024)+' MB).';
   if(item.fileSize===0&&!allowUnknownSize)return 'Não foi possível confirmar o tamanho de um ficheiro.';
   total+=item.fileSize;
  }else if(!allowUnknownSize)return 'Não foi possível confirmar o tamanho de um ficheiro.';
 }
 return total>MAX_TOTAL_BYTES?'O conjunto não pode exceder 40 MB.':null;
}
// Trust the actual local file over picker metadata, which may be stale.
function measuredPhotoSize(actualSize,pickerSize){
 if(Number.isSafeInteger(actualSize)&&actualSize>=0)return actualSize;
 if(Number.isSafeInteger(pickerSize)&&pickerSize>0)return pickerSize;
 return 0;
}
function attachmentLimit(mime){
 if(typeof mime!=='string')return 5*1024*1024;
 if(mime.startsWith('video/'))return 20*1024*1024;
 if(mime.startsWith('audio/'))return 12*1024*1024;
 return MAX_PHOTO_BYTES;
}
function chatAttachmentList(message){
 if(!message||message.deletedAt)return [];
 const extras=Array.isArray(message.attachments)?message.attachments:[];
 if(extras.length){
  return extras.filter(file=>file&&Number.isSafeInteger(file.index)&&file.index>=0&&file.index<MAX_FILES&&
    typeof file.filename==='string'&&file.filename&&typeof file.mimeType==='string'&&file.mimeType&&
    Number.isSafeInteger(file.size)&&file.size>0&&file.size<=attachmentLimit(file.mimeType))
   .filter((file,i,list)=>list.findIndex(other=>other.index===file.index)===i)
   .sort((a,b)=>a.index-b.index)
   .map(file=>({index:file.index,name:file.filename,mime:file.mimeType,size:file.size}));
 }
 if(typeof message.attachmentName!=='string'||!message.attachmentName)return [];
 return [{index:0,name:message.attachmentName,mime:message.attachmentMimeType||null,
  size:message.attachmentSize??null}];
}
// Prefetch a bounded number of recent image albums. The attachments are still
// downloaded with per-account Authorization and deleted when chat loses focus.
function recentPreviewMessageIds(messages,maxMessages=2){
 if(!Array.isArray(messages)||!Number.isSafeInteger(maxMessages)||maxMessages<1||maxMessages>4)return [];
 const eligible=messages.filter(message=>message&&Number.isSafeInteger(message.id)&&message.id>0&&!message.deletedAt&&
  chatAttachmentList(message).some(file=>typeof file.mime==='string'&&file.mime.startsWith('image/')));
 return eligible.slice(-maxMessages).map(message=>message.id);
}
module.exports={MAX_FILES,MAX_TOTAL_BYTES,MAX_PHOTO_BYTES,validateChatAlbum,measuredPhotoSize,chatAttachmentList,recentPreviewMessageIds};
