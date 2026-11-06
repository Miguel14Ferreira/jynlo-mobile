'use strict';

/** Only known links on our verified HTTPS domain become native routes.
 * Never map credentials or tokens from a non-Jynlo host.
 */
function nativeRouteForWebLink(path){
 if(typeof path!=='string'||!path.trim())return path;
 try{
  const url=new URL(path,'https://d24sports.com');
  if(url.protocol!=='https:'||url.hostname!=='d24sports.com')return path;
  const token=(v)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v||'')?v:null;
  if(url.pathname==='/'){
   const confirmation=token(url.searchParams.get('confirmRegistration'));
   return confirmation?'/confirm-email?token='+encodeURIComponent(confirmation):path;
  }
  const confirm=url.pathname.match(/^\/login\/registerNewUser\/confirmTokenRegistration\/([^/]+)$/);
  if(confirm){
   const t=token(decodeURIComponent(confirm[1]));
   return t?'/confirm-email?token='+encodeURIComponent(t):path;
  }
  const reset=url.pathname.match(/^\/login\/resetPassword\/([^/]+)$/);
  if(reset){
   const t=token(decodeURIComponent(reset[1]));
   return t?'/reset-password?token='+encodeURIComponent(t):path;
  }
  if(/^\/sessions\/[1-9]\d*$/.test(url.pathname))return url.pathname;
  if(/^\/venues\/[1-9]\d*$/.test(url.pathname))return url.pathname;
  if(['/privacy','/terms','/delete-account'].includes(url.pathname))
   return '/legal?document='+encodeURIComponent(url.pathname.slice(1));
  return path;
 }catch{return path;}
}
module.exports={nativeRouteForWebLink};
