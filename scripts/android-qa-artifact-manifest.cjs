'use strict';
/** Sidecar provenance for shareable Codemagic APKs.
 * Generated only after Gradle successfully emits an APK. No credentials,
 * device IDs, private build environment or Android signing keys are logged.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const API='https://desporto24-preview-api.onrender.com';
const SHA=/^[0-9a-f]{40}$/i;
const SAFE_FILE=/^[a-zA-Z0-9_.-]+\.apk$/;

function artifactMetadata(input,config,apkBytes){
 if(input.CM_BRANCH!=='develop')throw Error('A APK Jynlo só pode ser criada da develop.');
 if(input.CM_PULL_REQUEST==='true')throw Error('Não distribuir builds de pull requests.');
 if(!SHA.test(input.CM_COMMIT||''))throw Error('Commit Git inválido ou indisponível.');
 if((input.EXPO_PUBLIC_JYNLO_API_URL||'')!==API)
  throw Error('A APK de testes deve usar exclusivamente o backend preview.');
 if(config.android?.package!=='com.jynlo.app')
  throw Error('A APK não corresponde à identidade Android oficial Jynlo.');
 if(!Number.isInteger(config.android?.versionCode)||config.android.versionCode<=0||
    typeof config.version!=='string'||!/^\d+\.\d+\.\d+$/.test(config.version))
  throw Error('Versão Android inválida.');
 const name=input.JYNLO_APK_FILENAME||'app-release.apk';
 if(!SAFE_FILE.test(name))throw Error('Nome de APK inválido.');
 const withPush=Boolean(input.GOOGLE_SERVICES_JSON);
 if(input.JYNLO_REQUIRE_NATIVE_PUSH==='1'&&!withPush)
  throw Error('A build anunciada com push não inclui configuração Firebase.');
 if(!Buffer.isBuffer(apkBytes)||apkBytes.length<1024)
  throw Error('APK ausente ou demasiado pequena para distribuir.');
 return {
  artifact:'Jynlo Android QA',
  version:config.version,
  versionCode:config.android.versionCode,
  package:config.android.package,
  branch:input.CM_BRANCH,
  commit:input.CM_COMMIT.toLowerCase(),
  buildId:typeof input.CM_BUILD_ID==='string'?input.CM_BUILD_ID:'',
  workflow:typeof input.CM_WORKFLOW_NAME==='string'?input.CM_WORKFLOW_NAME:'',
  backend:API,
  pushConfigured:withPush,
  signing:'debug-keystore (QA only; cannot update differently signed APKs)',
  sha256:crypto.createHash('sha256').update(apkBytes).digest('hex'),
  file:name
 };
}

function writeManifest(environment=process.env,io=fs){
 const root=environment.CM_BUILD_DIR||path.resolve(__dirname,'..');
 const application=JSON.parse(io.readFileSync(path.join(root,'app.json'),'utf8')).expo;
 const apkDir=path.join(root,'android','app','build','outputs','apk','release');
 const found=io.readdirSync(apkDir).filter(name=>SAFE_FILE.test(name));
 if(found.length!==1)throw Error('Esperada exatamente uma APK release para distribuição.');
 const file=found[0];
 const bytes=io.readFileSync(path.join(apkDir,file));
 const metadata=artifactMetadata({...environment,JYNLO_APK_FILENAME:file},application,bytes);
 const out=path.join(root,'build-metadata');
 io.mkdirSync(out,{recursive:true});
 io.writeFileSync(path.join(out,'jynlo-android-qa.json'),JSON.stringify(metadata,null,2)+'\n');
 return metadata;
}
if(require.main===module){
 try{
  const metadata=writeManifest();
  console.log('Jynlo Android QA: APK validada; versão '+metadata.version+
   ' ('+metadata.versionCode+'), commit '+metadata.commit.slice(0,12)+
   ', push '+(metadata.pushConfigured?'configurado':'indisponível')+
   '. Manifesto de distribuição gerado.');
 }catch(error){
  console.error(error instanceof Error?error.message:'Erro na auditoria da APK.');
  process.exitCode=1;
 }
}
module.exports={artifactMetadata,writeManifest};
