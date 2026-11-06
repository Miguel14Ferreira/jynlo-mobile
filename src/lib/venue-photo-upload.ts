import {API_BASE,DEMO_MODE} from './api';
import type {ImagePickerAsset} from 'expo-image-picker';
import type {VenuePhoto} from './types';

const MAX_PHOTO_BYTES=8*1024*1024;
/** Authenticated user-initiated venue photo upload. Never retry an uncertain POST. */
export async function uploadVenuePhoto(venueId:number,token:string,asset:ImagePickerAsset):Promise<VenuePhoto>{
 if(DEMO_MODE||!token)throw new Error('Inicia sessão para adicionares fotografias.');
 if(!Number.isSafeInteger(venueId)||venueId<=0)throw new Error('Recinto inválido.');
 if(!asset.uri||asset.type!=='image')throw new Error('Seleciona uma fotografia válida.');
 if(asset.fileSize!=null&&asset.fileSize>MAX_PHOTO_BYTES)
  throw new Error('Fotografia demasiado grande (máximo 8 MB).');
 const mime=asset.mimeType||'image/jpeg';
 if(!['image/jpeg','image/png','image/webp'].includes(mime))
  throw new Error('Seleciona uma fotografia JPG, PNG ou WebP.');
 const extension=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';
 const form=new FormData();
 form.append('photo',{uri:asset.uri,name:'jynlo-venue.'+extension,type:mime} as unknown as Blob);
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetch(API_BASE+'/api/venues/'+venueId+'/photos',{
   method:'POST',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
   body:form,credentials:'omit',signal:controller.signal
  });
  if(!response.ok){
   if(response.status===401)throw new Error('Sessão expirada. Inicia sessão novamente.');
   if(response.status===403)throw new Error('Não tens autorização para adicionar esta fotografia.');
   if(response.status===413)throw new Error('Fotografia demasiado grande para o servidor.');
   throw new Error('O servidor não aceitou a fotografia.');
  }
  const photo=await response.json() as VenuePhoto;
  if(!Number.isSafeInteger(photo.id)||!photo.photoUrl)
   throw new Error('O envio não foi confirmado. Reabre o recinto antes de tentar novamente.');
  return photo;
 }catch(error){
  if(controller.signal.aborted)
   throw new Error('A ligação expirou. Confirma a galeria antes de repetires o envio.');
  if(error instanceof Error&&/^(Sessão expirada|Não tens autorização|Fotografia|O servidor|O envio)/.test(error.message))
   throw error;
  throw new Error('Não foi possível confirmar o envio. Reabre o recinto antes de repetir.');
 }finally{clearTimeout(timeout);}
}
