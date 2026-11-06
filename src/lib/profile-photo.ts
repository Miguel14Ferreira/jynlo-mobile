import {API_BASE,DEMO_MODE} from './api';
import type {ImagePickerAsset} from 'expo-image-picker';

type ProfilePhotoResponse={profilePicUrl?:string|null;username?:string};
const MAX_PHOTO_BYTES=8*1024*1024;

/** A photo upload is only made after the user confirms their selected image. */
export async function uploadMyProfilePhoto(token:string,asset:ImagePickerAsset):Promise<ProfilePhotoResponse>{
 if(DEMO_MODE||!token)throw new Error('Inicia sessão para atualizar a fotografia.');
 if(!asset.uri||asset.type!=='image')throw new Error('Seleciona uma fotografia válida.');
 if(asset.fileSize!=null&&asset.fileSize>MAX_PHOTO_BYTES)
  throw new Error('A fotografia é demasiado grande (máximo 8 MB).');
 const mime=asset.mimeType||'image/jpeg';
 if(!['image/jpeg','image/png','image/webp'].includes(mime))
  throw new Error('Seleciona uma fotografia JPG, PNG ou WebP.');
 const extension=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';
 const form=new FormData();
 // React Native encodes {uri,name,type} as a multipart file.
 form.append('photo',{uri:asset.uri,name:'jynlo-profile.'+extension,type:mime} as unknown as Blob);
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetch(API_BASE+'/api/profile/me/photo',{
   method:'PUT',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
   body:form,credentials:'omit',signal:controller.signal
  });
  if(!response.ok){
   if(response.status===401)throw new Error('Sessão expirada. Volta a iniciar sessão.');
   if(response.status===413)throw new Error('Fotografia demasiado grande para o servidor.');
   throw new Error('O servidor não aceitou a fotografia. Verifica o formato e o tamanho.');
  }
  const profile=await response.json() as ProfilePhotoResponse;
  if(!profile.profilePicUrl)throw new Error('O servidor não confirmou a nova fotografia.');
  return profile;
 }catch(error){
  if(controller.signal.aborted)
   throw new Error('A ligação expirou. Confirma a fotografia atual antes de tentar novamente.');
  if(error instanceof Error&&/^(Sessão expirada|Fotografia|O servidor)/.test(error.message))throw error;
  throw new Error('Não foi possível confirmar o envio. Verifica o perfil antes de repetir.');
 }finally{clearTimeout(timer);}
}
