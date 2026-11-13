'use strict';
/** Never ship a demo or private-network API endpoint to Play Store. */
const {isIP}=require('node:net');
const httpUrl=(process.env.EXPO_PUBLIC_JYNLO_API_URL||'').trim();
const storeRelease=process.argv.includes('--production') || ['production','play-internal'].includes(process.env.EAS_BUILD_PROFILE);
const release=storeRelease || process.env.JYNLO_REQUIRE_REAL_API==='1';
function checkProductionEnvironment(){
  if(!release) return {ok:true,mode:httpUrl?'api':'demo'};
  let url;
  try { url=new URL(httpUrl); } catch { url=null; }
  if(!url || url.protocol!=='https:' || !url.hostname || url.username || url.password ||
     url.search || url.hash || (url.pathname && url.pathname!=='/')) {
    throw new Error('BUILD BLOQUEADO: define EXPO_PUBLIC_JYNLO_API_URL=https://... para a versão de loja. Não podes publicar o modo demonstração.');
  }
  const host=url.hostname.toLowerCase();
  // A valid public HTTPS URL can still point to the preview database.
  // Never ship a Play Store AAB targeting our development/staging backend.
  if(storeRelease && (host==='desporto24-preview-api.onrender.com' ||
     /(?:^|[.-])(?:preview|staging|sandbox)(?:[.-]|$)/.test(host))) {
    throw new Error('BUILD BLOQUEADO: a versão de loja não pode usar o backend preview/staging. Configura a API de produção.');
  }
  const ipHost=host.startsWith('[') && host.endsWith(']') ? host.slice(1,-1) : host;
  // Store builds must not target literal IP addresses: private, loopback or public.
  // A verified DNS hostname is required for stable TLS and environment configuration.
  if(isIP(ipHost)) throw new Error('BUILD BLOQUEADO: utiliza um hostname HTTPS público, não um endereço IP.');
  if(host==='localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
     host.endsWith('.internal') || host.endsWith('.invalid') || host.endsWith('.test') ||
     host.endsWith('.example') || host==='example.com' || host.endsWith('.example.com') ||
     host.startsWith('demo.') || host==='127.0.0.1' || host==='0.0.0.0' ||
     host==='::1' || host==='[::1]' ||
     /^10\./.test(host) || /^192\.168\./.test(host) ||
     /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^169\.254\./.test(host)) {
    throw new Error('BUILD BLOQUEADO: endpoint de demonstração/inválido ou rede privada.');
  }
  return {ok:true,mode:'api'};
}
if(require.main===module){
  try {const status=checkProductionEnvironment();console.log(`Jynlo release guard: OK (${status.mode}).`);}
  catch(error){console.error(error.message);process.exit(1);}
}
module.exports={checkProductionEnvironment};
