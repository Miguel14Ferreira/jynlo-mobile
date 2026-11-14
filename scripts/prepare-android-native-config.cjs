'use strict';
/** Codemagic: securely prepare optional Firebase Android config for native push.
 * A standalone QA APK must never pretend push is enabled unless this project
 * has a google-services.json matching the signed app's package.
 * Supported sources:
 * - GOOGLE_SERVICES_JSON: existing file path (Expo/EAS file variable)
 * - JYNLO_FIREBASE_ANDROID_JSON_B64: encrypted Codemagic environment value
 * Never print, upload, commit or expose Firebase JSON in build logs.
 */
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');

function validateAndroidFirebaseConfig(raw,expectedPackage='com.jynlo.app'){
 let data;
 try{data=JSON.parse(raw);}
 catch{throw Error('Firebase Android: JSON inválido.');}
 if(!data||typeof data!=='object'||!Array.isArray(data.client)||
   typeof data.project_info?.project_id!=='string'||!data.project_info.project_id.trim())
  throw Error('Firebase Android: estrutura de projeto incompleta.');
 if(!data.client.some(client=>
   client?.client_info?.android_client_info?.package_name===expectedPackage&&
   typeof client?.client_info?.mobilesdk_app_id==='string'&&
   client.client_info.mobilesdk_app_id.length>=8))
  throw Error('Firebase Android: ficheiro não corresponde ao pacote '+expectedPackage+'.');
 return true;
}
function prepare(config=process.env,io={fs,path,os}){
 const encoded=(config.JYNLO_FIREBASE_ANDROID_JSON_B64||'').trim();
 const existing=(config.GOOGLE_SERVICES_JSON||'').trim();
 if(encoded&&existing)throw Error('Firebase Android: usa apenas uma das duas fontes de configuração.');
 if(!encoded&&!existing){
  if(config.JYNLO_REQUIRE_NATIVE_PUSH==='1')
   throw Error('Firebase Android: este workflow exige o segredo JYNLO_FIREBASE_ANDROID_JSON_B64 no grupo Codemagic jynlo_android_native.');
  return {configured:false,reason:'not-provided'};
 }
 let file=existing;
 if(encoded){
  if(encoded.length>1024*1024||encoded.length%4!==0||
     !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
   throw Error('Firebase Android: segredo base64 inválido.');
  const buffer=Buffer.from(encoded,'base64');
  if(buffer.length>512*1024||!buffer.length)
   throw Error('Firebase Android: tamanho inválido.');
  const raw=buffer.toString('utf8');
  validateAndroidFirebaseConfig(raw);
  if(!config.CM_ENV)throw Error('Firebase Android: CM_ENV indisponível na build Codemagic.');
  const folder=io.fs.mkdtempSync(io.path.join(io.os.tmpdir(),'jynlo-firebase-'));
  io.fs.chmodSync(folder,0o700);
  file=io.path.join(folder,'google-services.json');
  io.fs.writeFileSync(file,raw,{mode:0o600,flag:'wx'});
  // CM_ENV propagates environment variables to subsequent Codemagic steps.
  io.fs.appendFileSync(config.CM_ENV,'GOOGLE_SERVICES_JSON='+file+'\n');
 }else{
  if(!io.fs.existsSync(file)||!io.fs.statSync(file).isFile())
   throw Error('Firebase Android: GOOGLE_SERVICES_JSON não aponta para um ficheiro válido.');
  const raw=io.fs.readFileSync(file,'utf8');
  if(raw.length>512*1024)throw Error('Firebase Android: tamanho inválido.');
  validateAndroidFirebaseConfig(raw);
 }
 return {configured:true};
}
if(require.main===module){
 try{
  const status=prepare();
  console.log(status.configured
   ?'Firebase Android: configuração validada para com.jynlo.app (push nativo disponível na build).'
   :'Firebase Android: não configurado; a APK de testes não poderá receber push, mas mantém as notificações internas.');
 }catch(e){
  console.error(e instanceof Error?e.message:'Falha na configuração Firebase Android.');
  process.exitCode=1;
 }
}
module.exports={validateAndroidFirebaseConfig,prepare};
