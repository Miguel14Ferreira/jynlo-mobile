import {API_BASE,DEMO_MODE} from './api';
import type {ImagePickerAsset} from 'expo-image-picker';
import type {PrivateGroup} from './private-groups-core.cjs';

const MAX_BYTES=5*1024*1024;
/** Same rules as the server: creator only, one image up to 5 MB. Only sent after the user confirms. */
export async function uploadGroupPhoto(groupId:number,token:string,asset:ImagePickerAsset):Promise<PrivateGroup>{
 if(DEMO_MODE||!token)throw new Error('Inicia sessão para alterar a fotografia.');
 if(!Number.isSafeInteger(groupId)||groupId<=0)throw new Error('Grupo inválido.');
 if(!asset.uri||asset.type!=='image')throw new Error('Seleciona uma fotografia válida.');
 if(asset.fileSize!=null&&asset.fileSize>MAX_BYTES)throw new Error('A fotografia é demasiado grande (máximo 5 MB).');
 const mime=asset.mimeType||'image/jpeg';
 if(!['image/jpeg','image/png','image/webp','image/gif'].includes(mime))throw new Error('Escolhe uma imagem JPG, PNG, WEBP ou GIF.');
 const extension=mime==='image/png'?'png':mime==='image/webp'?'webp':mime==='image/gif'?'gif':'jpg';
 const form=new FormData();
 form.append('photo',{uri:asset.uri,name:'jynlo-group.'+extension,type:mime} as unknown as Blob);
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetch(`${API_BASE}/api/private-groups/${groupId}/photo`,{
   method:'POST',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
   body:form,credentials:'omit',signal:controller.signal
  });
  if(!response.ok){
   if(response.status===401)throw new Error('Sessão expirada. Volta a iniciar sessão.');
   if(response.status===403)throw new Error('Só quem criou o grupo pode alterar a fotografia.');
   if(response.status===413)throw new Error('Fotografia demasiado grande para o servidor.');
   throw new Error('O servidor não aceitou a fotografia. Verifica o formato e o tamanho.');
  }
  const group=await response.json() as PrivateGroup;
  if(!group||group.id!==groupId)throw new Error('O servidor não confirmou a nova fotografia.');
  return group;
 }catch(error){
  if(controller.signal.aborted)throw new Error('A ligação expirou. Confirma a fotografia do grupo antes de tentar novamente.');
  if(error instanceof Error&&/^(Sessão expirada|Só quem|Fotografia|O servidor)/.test(error.message))throw error;
  throw new Error('Não foi possível confirmar o envio. Verifica o grupo antes de repetir.');
 }finally{clearTimeout(timer);}
}
