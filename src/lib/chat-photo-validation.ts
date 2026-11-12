import type {ImagePickerAsset} from 'expo-image-picker';

const MAX_CHAT_PHOTO_BYTES=5*1024*1024;
const SUPPORTED_CHAT_PHOTO_MIMES=new Set(['image/jpeg','image/png','image/webp','image/gif']);

/** Validate type and known size early; the upload preflight checks unknown Android sizes from disk. */
export function validateChatPhoto(asset:ImagePickerAsset):void{
 if(asset.type!=='image'||!asset.uri)throw Error('Seleciona uma fotografia válida.');
 if(asset.fileSize!=null&&(!Number.isSafeInteger(asset.fileSize)||asset.fileSize<0||asset.fileSize>MAX_CHAT_PHOTO_BYTES))
  throw Error('A fotografia não pode exceder 5 MB.');
 if(!SUPPORTED_CHAT_PHOTO_MIMES.has(asset.mimeType||''))
  throw Error('Formato não suportado. Escolhe uma fotografia JPG, PNG, WebP ou GIF.');
}
