import {fetch as expoFetch} from 'expo/fetch';
import {File,Paths} from 'expo-file-system';
import {API_BASE,DEMO_MODE} from './api';

const protectedPath=/^\/api\/profile-media\/(?:posts\/[1-9]\d*\/(?:image|video|extra-[0-5])|stories\/[1-9]\d*)$/;

/**
 * Downloads an authorized private asset into an ephemeral file.
 * Never forwards bearer tokens to URLs outside the configured Jynlo API.
 * Call releasePrivateProfileMedia when the viewer closes or signs out.
 */
export async function downloadPrivateProfileMedia(path:string,token:string):Promise<File>{
 if(DEMO_MODE||!token||!protectedPath.test(path))throw Error('Conteúdo protegido inválido.');
 const target=new File(Paths.cache,`jynlo-private-${Date.now()}-${Math.random().toString(36).slice(2)}`);
 try{
  const response=await expoFetch(API_BASE+path,{
   headers:{Authorization:`Bearer ${token}`,Accept:'image/*, video/*'},
   cache:'no-store'
  });
  if(!response.ok)throw Error('Não tens autorização para ver este conteúdo.');
  const mime=response.headers.get('content-type')||'';
  if(!/^(image\/(jpeg|png|webp)|video\/(mp4|webm))(?:;|$)/i.test(mime))
    throw Error('Formato protegido inesperado.');
  const length=Number(response.headers.get('content-length')||0);
  if(length>60*1024*1024)throw Error('Conteúdo demasiado grande.');
  const bytes=await response.bytes();
  if(bytes.length===0||bytes.length>60*1024*1024)throw Error('Ficheiro protegido inválido.');
  await target.write(bytes);
  return target;
 }catch(error){
  try{if(target.exists)target.delete();}catch{}
  throw error;
 }
}
export function releasePrivateProfileMedia(file:File|null|undefined):void {
 if(!file)return;
 try{if(file.exists)file.delete();}catch{}
}
