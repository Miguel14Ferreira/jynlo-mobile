'use strict';
/** Never ship a demo or private-network API endpoint to Play Store. */
const {isIP}=require('node:net');
const fs=require('node:fs');
const httpUrl=(process.env.EXPO_PUBLIC_JYNLO_API_URL||'').trim();
const profile=process.env.EAS_BUILD_PROFILE||'';
const iosStoreRelease=profile==='ios-testflight';
// Keep --production backward-compatible with the Android release checks,
// but iOS TestFlight must never require Android Maps or Firebase secrets.
const androidStoreRelease=['production','play-internal'].includes(profile) ||
  (process.argv.includes('--production')&&!iosStoreRelease);
const storeRelease=androidStoreRelease||iosStoreRelease;
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
  // Never ship a Play Store AAB or TestFlight IPA targeting development/staging.
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
  if(androidStoreRelease){
    const mapsKey=(process.env.JYNLO_GOOGLE_MAPS_ANDROID_API_KEY||'').trim();
    if(!/^AIza[0-9A-Za-z_-]{35}$/.test(mapsKey))
      throw new Error('BUILD BLOQUEADO: falta uma chave Google Maps Android válida na configuração EAS de loja.');
    const firebaseFile=(process.env.GOOGLE_SERVICES_JSON||'').trim();
    if(!firebaseFile || !fs.existsSync(firebaseFile))
      throw new Error('BUILD BLOQUEADO: falta GOOGLE_SERVICES_JSON (ficheiro Firebase Android) na configuração EAS de loja.');
    let firebase;
    try { firebase=JSON.parse(fs.readFileSync(firebaseFile,'utf8')); }
    catch { throw new Error('BUILD BLOQUEADO: GOOGLE_SERVICES_JSON não contém JSON Firebase válido.'); }
    if(!Array.isArray(firebase.client)||!firebase.client.some(client=>
      client?.client_info?.android_client_info?.package_name==='com.jynlo.app'))
      throw new Error('BUILD BLOQUEADO: o ficheiro Firebase não está configurado para com.jynlo.app.');
  }
  return {ok:true,mode:'api'};
}
if(require.main===module){
  try {const status=checkProductionEnvironment();console.log(`Jynlo release guard: OK (${status.mode}).`);}
  catch(error){console.error(error.message);process.exit(1);}
}
module.exports={checkProductionEnvironment};
