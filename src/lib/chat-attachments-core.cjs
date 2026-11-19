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
/** Merge one or more picker selections without dropping earlier attachments.
 * Preserve order and deduplicate URIs. Invalid additions never change the draft.
 */
function appendChatMediaSelection(existing,selected){
 const current=Array.isArray(existing)?existing:[];
 const additions=Array.isArray(selected)?selected:[];
 const merged=[...current],seen=new Set(current.map(file=>file?.uri));
 for(const item of additions){
  if(!item||typeof item.uri!=='string'||!item.uri)return {items:current,error:'Ficheiro inválido.'};
  if(seen.has(item.uri))continue;
  seen.add(item.uri);merged.push(item);
 }
 const error=validateChatAlbum(merged,{allowUnknownSize:true});
 return error?{items:current,error}:{items:merged,error:null};
}
/** Single authoritative native-file check used before every private media upload. */
function verifiedLocalChatMediaSize(size,type){
 if(type!=='image'&&type!=='video')throw Error('Tipo de anexo inválido.');
 if(!Number.isSafeInteger(size)||size<=0)
  throw Error(type==='video'?
   'Não foi possível confirmar o tamanho real do vídeo. Escolhe novamente o ficheiro.':
   'Não foi possível confirmar o tamanho real da fotografia. Escolhe novamente o ficheiro.');
 if(size>(type==='video'?MAX_VIDEO_BYTES:MAX_PHOTO_BYTES))
  throw Error(type==='video'?'O vídeo deve ter até 20 MB.':'A fotografia deve ter até 5 MB.');
 return size;
}
// Trust the actual local file over picker metadata, which may be stale.
function measuredPhotoSize(actualSize,pickerSize){
 if(Number.isSafeInteger(actualSize)&&actualSize>=0)return actualSize;
 if(Number.isSafeInteger(pickerSize)&&pickerSize>0)return pickerSize;
 return 0;
}
// This set must stay aligned with SecureChatAttachment's authenticated viewers.
// Never offer a download based on arbitrary MIME metadata supplied by a response.
const RECEIVABLE_MIME=new Set([
 'image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm',
 'application/pdf','audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/x-m4a','audio/aac'
]);
function attachmentLimit(mime){
 if(typeof mime!=='string'||!RECEIVABLE_MIME.has(mime))return 0;
 if(mime.startsWith('video/'))return MAX_VIDEO_BYTES;
 if(mime.startsWith('audio/'))return 12*1024*1024;
 return MAX_PHOTO_BYTES;
}
function safeAttachment(index,name,mime,size){
 if(!Number.isSafeInteger(index)||index<0||index>=MAX_FILES||
  typeof name!=='string'||!name.trim()||name.length>255||/[\\/\x00-\x1f\x7f]/.test(name)||
  typeof mime!=='string'||!RECEIVABLE_MIME.has(mime)||
  !Number.isSafeInteger(size)||size<=0||size>attachmentLimit(mime))return null;
 return {index,name,mime,size};
}
function chatAttachmentList(message){
 if(!message||typeof message!=='object'||message.deletedAt)return [];
 // If the backend advertises an album, do not fall back to an unverified
 // cover when every album entry was malformed.
 if(Array.isArray(message.attachments)&&message.attachments.length){
  const seen=new Set(),valid=[];
  for(const file of message.attachments.slice(0,MAX_FILES*4)){
   if(!file||typeof file!=='object')continue;
   const item=safeAttachment(file.index,file.filename,file.mimeType,file.size);
   if(!item||seen.has(item.index))continue;
   seen.add(item.index);valid.push(item);
  }
  return valid.sort((a,b)=>a.index-b.index);
 }
 const item=safeAttachment(0,message.attachmentName,message.attachmentMimeType,message.attachmentSize);
 return item?[item]:[];
}
/** A 2xx photo upload is not enough: the returned message must belong to
 * the requested conversation, carry the selected MIME, and not be deleted.
 * Do not clear a draft on an unrelated or incomplete server response.
 */
function confirmedSingleChatPhotoReply(reply,scope,conversationId,requestedMime,replyToId){
 if(!reply||!Number.isSafeInteger(reply.id)||reply.id<=0||reply.deletedAt||
  typeof reply.attachmentName!=='string'||!reply.attachmentName.trim()||
  reply.attachmentMimeType!==requestedMime||
  !Number.isSafeInteger(reply.attachmentSize)||reply.attachmentSize<=0||
  reply.attachmentSize>attachmentLimit(requestedMime)||
  (reply.replyToMessageId??null)!==(replyToId??null))return false;
 if(scope==='community')
  return Number.isSafeInteger(conversationId)&&conversationId>0&&
   reply.communityId===conversationId&&reply.kind==='CHAT';
 if(scope==='session')
  return Number.isSafeInteger(conversationId)&&conversationId>0&&
   reply.sessionId===conversationId&&typeof reply.senderUsername==='string'&&Boolean(reply.senderUsername.trim());
 if(scope==='direct')
  return typeof conversationId==='string'&&Boolean(conversationId.trim())&&
   typeof reply.username2==='string'&&reply.username2.toLowerCase()===conversationId.toLowerCase();
 return false;
}
/** Validate exactly the files the server persisted before clearing the composer. */
function confirmedChatAlbumReply(reply,requestedMimes){
 if(!reply||!Number.isSafeInteger(reply.id)||reply.id<=0||
  !Array.isArray(requestedMimes)||requestedMimes.length<1||requestedMimes.length>MAX_FILES||
  !Array.isArray(reply.attachments)||reply.attachments.length!==requestedMimes.length)return false;
 const seen=new Set();
 for(const item of reply.attachments){
  if(!item||!Number.isSafeInteger(item.index)||item.index<0||
    item.index>=requestedMimes.length||seen.has(item.index)||
    item.mimeType!==requestedMimes[item.index]||
    typeof item.filename!=='string'||!item.filename||
    !Number.isSafeInteger(item.size)||item.size<=0||
    item.size>attachmentLimit(item.mimeType))return false;
  seen.add(item.index);
 }
 return seen.size===requestedMimes.length;
}
// Prefetch a bounded number of recent image albums. The attachments are still
// downloaded with per-account Authorization and deleted when chat loses focus.
function recentPreviewMessageIds(messages,maxMessages=2){
 if(!Array.isArray(messages)||!Number.isSafeInteger(maxMessages)||maxMessages<1||maxMessages>4)return [];
 const eligible=messages.filter(message=>message&&Number.isSafeInteger(message.id)&&message.id>0&&!message.deletedAt&&
  chatAttachmentList(message).some(file=>typeof file.mime==='string'&&file.mime.startsWith('image/')));
 return eligible.slice(-maxMessages).map(message=>message.id);
}
module.exports={MAX_FILES,MAX_TOTAL_BYTES,MAX_PHOTO_BYTES,validateChatAlbum,appendChatMediaSelection,measuredPhotoSize,verifiedLocalChatMediaSize,chatAttachmentList,recentPreviewMessageIds,confirmedChatAlbumReply,confirmedSingleChatPhotoReply};
