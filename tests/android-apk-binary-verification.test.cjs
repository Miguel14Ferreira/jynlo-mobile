const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseApkBadging,parseApkSignature,verifyAndroidApk}=require('../scripts/verify-android-apk.cjs');

const BADGING="package: name='com.jynlo.app' versionCode='13' versionName='0.16.6'\nsdkVersion:'24'\n";
const DIGEST='ab'.repeat(32);
const SIGNED='Verifies\nVerified using v2 scheme (APK Signature Scheme v2): true\n'+
 'Signer #1 certificate DN: CN=Android Debug,O=Android,C=US\n'+
 'Signer #1 certificate SHA-256 digest: '+DIGEST+'\n';
const expected={version:'0.16.6',android:{package:'com.jynlo.app',versionCode:13}};
const sdk='/android-sdk';
const io={
 statSync:()=>({isFile:()=>true,size:20000000}),
 readdirSync:()=>[{name:'35.0.0',isDirectory:()=>true}],
 existsSync:()=>true
};
const env={ANDROID_SDK_ROOT:sdk};
function exec(program,args){
 if(program.endsWith('/aapt')){
  assert.deepEqual(args.slice(0,2),['dump','badging']);
  return BADGING;
 }
 assert.ok(program.endsWith('/apksigner'));
 assert.deepEqual(args.slice(0,2),['verify','--print-certs']);
 return SIGNED;
}

test('actual APK metadata is parsed from the aapt badging output',()=>{
 assert.deepEqual(parseApkBadging(BADGING),{
  package:'com.jynlo.app',version:'0.16.6',versionCode:13
 });
 assert.throws(()=>parseApkBadging("package: name='com.fake.app'"),/pacote ou versão/);
});

test('certificate fingerprint is extracted without private signing data',()=>{
 assert.deepEqual(parseApkSignature(SIGNED),{
  signerCertificateSha256:DIGEST,signingType:'debug'
 });
 assert.throws(()=>parseApkSignature('unsigned APK'),/assinatura inválidos/);
 assert.throws(()=>parseApkSignature(SIGNED+SIGNED.replaceAll('#1','#2').replaceAll(DIGEST,'cd'.repeat(32))),/exatamente uma identidade/);
});

test('modern apksigner V3.0 and V2 labels identify the same verified debug certificate',()=>{
 const modern='Verifies\nVerified using v2 scheme (APK Signature Scheme v2): true\n'+
  'V2 Signer: certificate DN: CN=Android Debug,O=Android,C=US\n'+
  'V2 Signer: certificate SHA-256 digest: '+DIGEST+'\n'+
  'V3.0 Signer: certificate DN: CN=Android Debug,O=Android,C=US\n'+
  'V3.0 Signer: certificate SHA-256 digest: '+DIGEST+'\n';
 assert.deepEqual(parseApkSignature(modern),{
  signerCertificateSha256:DIGEST,signingType:'debug'
 });
 const modernCustom=modern.replaceAll('CN=Android Debug','CN=Jynlo Signing');
 assert.equal(parseApkSignature(modernCustom).signingType,'custom');
});

test('versioned signers with different fingerprints are rejected',()=>{
 const modern='V2 Signer: certificate SHA-256 digest: '+DIGEST+'\n'+
  'V3.0 Signer: certificate SHA-256 digest: '+'cd'.repeat(32)+'\n';
 assert.throws(()=>parseApkSignature(modern),/exatamente uma identidade/);
 assert.throws(()=>parseApkSignature('V3.0 Signer: certificate SHA-256 digest: not-a-digest\n'),/assinatura inválidos/);
});

test('real APK verification checks package, version and verified signing certificate',()=>{
 const report=verifyAndroidApk('/workspace/android/app-release.apk',expected,env,io,exec);
 assert.equal(report.verified,true);
 assert.equal(report.androidBuildTools,'35.0.0');
 assert.equal(report.signerCertificateSha256,DIGEST);
 assert.equal(report.signingType,'debug');
});

test('fail closed on APK from another application even if it is signed',()=>{
 const foreign=(program,args)=>program.endsWith('/aapt')
  ?BADGING.replace('com.jynlo.app','com.other.app'):SIGNED;
 assert.throws(()=>verifyAndroidApk('/workspace/app.apk',expected,env,io,foreign),/pacote do binário/);
});

test('fail closed on version mismatch after prebuild',()=>{
 const oldVersion=(program,args)=>program.endsWith('/aapt')
  ?BADGING.replace("versionCode='13'","versionCode='12'"):SIGNED;
 assert.throws(()=>verifyAndroidApk('/workspace/app.apk',expected,env,io,oldVersion),/versão interna/);
});

test('invalid APK signatures fail the build even when the package matches',()=>{
 const unsigned=(program,args)=>{
  if(program.endsWith('/aapt'))return BADGING;
  throw Error('apksigner: DOES NOT VERIFY');
 };
 assert.throws(()=>verifyAndroidApk('/workspace/app.apk',expected,env,io,unsigned),/DOES NOT VERIFY/);
});

test('unconfigured Android SDK and suspiciously small APK fail closed',()=>{
 assert.throws(()=>verifyAndroidApk('/workspace/app.apk',expected,{},io,exec),/SDK não configurado/);
 const tiny={...io,statSync:()=>({isFile:()=>true,size:512})};
 assert.throws(()=>verifyAndroidApk('/workspace/app.apk',expected,env,tiny,exec),/invulgarmente pequena/);
});

test('both Codemagic Android workflows verify real binary BEFORE generating manifest',()=>{
 const fs=require('node:fs');
 const path=require('node:path');
 const yaml=untranslate(fs.readFileSync(path.join(__dirname,'../codemagic.yaml'),'utf8'));
 const pieces=yaml.split(/^  jynlo-android-(?:push-)?qa:/m).slice(1,3);
 assert.equal(pieces.length,2);
 for(const piece of pieces){
  const compile=piece.indexOf('./gradlew assembleRelease');
  const verify=piece.indexOf('node scripts/verify-android-apk.cjs');
  const manifest=piece.indexOf('node scripts/android-qa-artifact-manifest.cjs');
  assert.ok(compile>=0 && compile<verify && verify<manifest);
  assert.match(piece,/build-metadata\/jynlo-android-binary-verification\.json/);
 }
});
