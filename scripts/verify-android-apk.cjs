'use strict';
/** Verify the ACTUAL standalone APK with Android SDK build-tools before it
 * can be shared. app.json alone does not establish package, version or signing.
 * No secrets or signing key files are read or logged by this script.
 */
const fs=require('node:fs');
const path=require('node:path');
const child=require('node:child_process');

const HEX64=/^[0-9a-f]{64}$/i;
function parseApkBadging(output){
 if(typeof output!=='string')throw Error('Android aapt: resultado ausente.');
 const line=output.split(/\r?\n/).find(v=>/^package:\s/.test(v))||'';
 const attributes=Object.fromEntries([...line.matchAll(/([a-zA-Z][\w]*)='([^']*)'/g)]
   .map(m=>[m[1],m[2]]));
 if(!/^([a-zA-Z][\w]*\.)+[a-zA-Z][\w]*$/.test(attributes.name||'')||
    !/^\d+$/.test(attributes.versionCode||'')||
    typeof attributes.versionName!=='string'||!/^\d+\.\d+\.\d+$/.test(attributes.versionName))
  throw Error('Android aapt: pacote ou versão inválidos.');
 return {package:attributes.name,versionCode:Number(attributes.versionCode),
  version:attributes.versionName};
}
function parseApkSignature(output){
 if(typeof output!=='string')throw Error('Android apksigner: resultado ausente.');
 const match=output.match(/Signer #1 certificate SHA-256 digest:\s*([a-f0-9:]+)/i);
 const digest=match?.[1]?.replace(/:/g,'').toLowerCase()||'';
 if(!HEX64.test(digest))throw Error('Android apksigner: certificado ou assinatura inválidos.');
 const signerCount=[...output.matchAll(/Signer #(\d+) certificate SHA-256 digest:/gi)].length;
 if(signerCount!==1)throw Error('Android apksigner: esperada exatamente uma assinatura.');
 return {
  signerCertificateSha256:digest,
  signingType:/Signer #1 certificate DN:.*CN=Android Debug/i.test(output)?'debug':'custom'
 };
}
function sdkTools(environment=process.env,io=fs){
 const root=environment.ANDROID_SDK_ROOT||environment.ANDROID_HOME;
 if(!root)throw Error('Android SDK não configurado.');
 const folder=path.join(root,'build-tools');
 const versions=io.readdirSync(folder,{withFileTypes:true}).filter(x=>x.isDirectory())
  .map(x=>x.name).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
 for(const version of versions){
  const aapt=path.join(folder,version,'aapt');
  const signer=path.join(folder,version,'apksigner');
  if(io.existsSync(aapt)&&io.existsSync(signer))return {aapt,signer,version};
 }
 throw Error('Ferramentas Android aapt/apksigner indisponíveis.');
}
function verifyAndroidApk(apk,expected,environment=process.env,io=fs,execute=child.execFileSync){
 if(!io.statSync(apk).isFile()||io.statSync(apk).size<100000)
  throw Error('APK Android ausente ou invulgarmente pequena.');
 const tools=sdkTools(environment,io);
 const exec=(program,args)=>execute(program,args,{encoding:'utf8',maxBuffer:2*1024*1024,
  timeout:120000,stdio:['ignore','pipe','pipe']});
 // apksigner returns nonzero for an invalid/tampered/untrusted APK signature.
 const actual=parseApkBadging(exec(tools.aapt,['dump','badging',apk]));
 const signed=parseApkSignature(exec(tools.signer,['verify','--print-certs',apk]));
 if(actual.package!=='com.jynlo.app'||actual.package!==expected.android?.package)
  throw Error('APK Android: pacote do binário não corresponde à Jynlo.');
 if(actual.versionCode!==expected.android?.versionCode||actual.version!==expected.version)
  throw Error('APK Android: versão interna diferente da configuração Jynlo.');
 return {...actual,...signed,androidBuildTools:tools.version,verified:true};
}
function verifyOutput(environment=process.env,io=fs){
 const root=environment.CM_BUILD_DIR||path.resolve(__dirname,'..');
 const expected=JSON.parse(io.readFileSync(path.join(root,'app.json'),'utf8')).expo;
 const folder=path.join(root,'android/app/build/outputs/apk/release');
 const candidates=io.readdirSync(folder).filter(n=>/^[a-zA-Z0-9_.-]+\.apk$/.test(n));
 if(candidates.length!==1)throw Error('Esperada exatamente uma APK release.');
 const report=verifyAndroidApk(path.join(folder,candidates[0]),expected,environment,io);
 const metadata=path.join(root,'build-metadata');
 io.mkdirSync(metadata,{recursive:true});
 io.writeFileSync(path.join(metadata,'jynlo-android-binary-verification.json'),
  JSON.stringify(report,null,2)+'\n');
 return report;
}
if(require.main===module){
 try{
  const report=verifyOutput();
  console.log('APK Android verificada: '+report.package+' v'+report.version+
    ' ('+report.versionCode+'), assinatura '+report.signingType+
    ', fingerprint '+report.signerCertificateSha256.slice(0,12)+'…');
 }catch(error){
  console.error(error instanceof Error?error.message:'Falha na verificação do APK.');
  process.exitCode=1;
 }
}
module.exports={parseApkBadging,parseApkSignature,sdkTools,verifyAndroidApk,verifyOutput};
