const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const os=require('node:os');
const {artifactMetadata,writeManifest,qaTestInstructions}=require('../scripts/android-qa-artifact-manifest.cjs');
const app=JSON.parse(untranslate(fs.readFileSync(path.join(__dirname,'..','app.json'),'utf8'))).expo;
const input={
 CM_BRANCH:'develop',
 CM_COMMIT:'a'.repeat(40),
 CM_BUILD_ID:'test-build-id',
 CM_WORKFLOW_NAME:'Jynlo Android - APK de testes (develop)',
 EXPO_PUBLIC_JYNLO_API_URL:'https://desporto24-preview-api.onrender.com',
 JYNLO_APK_FILENAME:'app-release.apk'
};
const bytes=Buffer.alloc(2048,42);
const report={verified:true,package:'com.jynlo.app',version:app.version,
 versionCode:app.android.versionCode,file:'app-release.apk',
 apkSha256:crypto.createHash('sha256').update(bytes).digest('hex'),
 signerCertificateSha256:'ab'.repeat(32),signingType:'debug',androidBuildTools:'35.0.0'};

test('QA APK manifest identifies exact commit, version, file checksum and backend',()=>{
 const result=artifactMetadata(input,app,bytes,report);
 assert.equal(result.commit,input.CM_COMMIT);
 assert.equal(result.version,app.version);
 assert.equal(result.versionCode,app.android.versionCode);
 assert.equal(result.package,'com.jynlo.app');
 assert.equal(result.backend,input.EXPO_PUBLIC_JYNLO_API_URL);
 assert.equal(result.pushConfigured,false);
 assert.equal(result.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));
 assert.match(result.signing,/debug-key/);
 assert.equal(result.binaryVerified,true);
 assert.equal(result.signerCertificateSha256,report.signerCertificateSha256);
});

test('push is recorded only if native Firebase config was provided',()=>{
 assert.equal(artifactMetadata({...input,GOOGLE_SERVICES_JSON:'/private/firebase.json'},app,bytes,report).pushConfigured,true);
 assert.throws(()=>artifactMetadata({...input,JYNLO_REQUIRE_NATIVE_PUSH:'1'},app,bytes,report),/não inclui configuração Firebase/);
});

test('manifest refuses master, pull request, wrong API and unidentified commit',()=>{
 assert.throws(()=>artifactMetadata({...input,CM_BRANCH:'master'},app,bytes,report),/develop/);
 assert.throws(()=>artifactMetadata({...input,CM_PULL_REQUEST:'true'},app,bytes,report),/pull requests/);
 assert.throws(()=>artifactMetadata({...input,CM_COMMIT:'unknown'},app,bytes,report),/Commit Git/);
 assert.throws(()=>artifactMetadata({...input,EXPO_PUBLIC_JYNLO_API_URL:'https://evil.example'},app,bytes,report),/backend preview/);
});

test('manifest rejects non-Jynlo Android package even when version and branch match',()=>{
 assert.throws(()=>artifactMetadata(input,{
  ...app,android:{...app.android,package:'com.example.clone'}
 },bytes,report),/identidade Android oficial/);
});

test('manifest refuses empty APK and unsafe file names',()=>{
 assert.throws(()=>artifactMetadata(input,app,Buffer.from('bad'),report),/APK ausente/);
 assert.throws(()=>artifactMetadata({...input,JYNLO_APK_FILENAME:'../private.apk'},app,bytes,report),/Nome de APK inválido/);
 assert.throws(()=>artifactMetadata({...input,JYNLO_APK_FILENAME:'app.aab'},app,bytes,report),/Nome de APK inválido/);
});

test('APK sidecar is generated from the real output folder without secrets',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'jynlo-manifest-test-'));
 try{
  const dir=path.join(root,'android/app/build/outputs/apk/release');
  fs.mkdirSync(dir,{recursive:true});
  fs.copyFileSync(path.join(__dirname,'../app.json'),path.join(root,'app.json'));
  fs.writeFileSync(path.join(dir,'app-release.apk'),bytes);
  const metadataDir=path.join(root,'build-metadata');
  fs.mkdirSync(metadataDir,{recursive:true});
  fs.writeFileSync(path.join(metadataDir,'jynlo-android-binary-verification.json'),JSON.stringify(report));
  const output=writeManifest({...input,CM_BUILD_DIR:root,GOOGLE_SERVICES_JSON:'/private/firebase.json'});
  const sidecar=JSON.parse(untranslate(fs.readFileSync(path.join(root,'build-metadata/jynlo-android-qa.json'),'utf8')));
  assert.equal(sidecar.sha256,output.sha256);
  assert.equal(sidecar.pushConfigured,true);
  assert.equal(sidecar.binaryVerified,true);
  assert.equal(sidecar.signerCertificateSha256,report.signerCertificateSha256);
  const guide=untranslate(fs.readFileSync(path.join(root,'build-metadata/LEIA-ME-JYNLO-ANDROID-QA.txt'),'utf8'));
  assert.match(guide,/JYNLO — PLANO DE TESTES DA APK ANDROID/);
  assert.match(guide,/SHA-256:/);
  assert.match(guide,/confirmar receção real de uma notificação/);
  assert.equal(JSON.stringify(sidecar).includes('/private/firebase.json'),false);
  assert.equal(JSON.stringify(sidecar).includes('JYNLO_FIREBASE_ANDROID_JSON_B64'),false);
 }finally{fs.rmSync(root,{force:true,recursive:true});}
});

test('release manifest rejects missing, changed or unrelated binary verification',()=>{
 assert.throws(()=>artifactMetadata(input,app,bytes),/sem verificação binária/);
 assert.throws(()=>artifactMetadata(input,app,bytes,{...report,apkSha256:'0'.repeat(64)}),/divergente/);
 assert.throws(()=>artifactMetadata(input,app,bytes,{...report,signerCertificateSha256:'invalid'}),/divergente/);
 assert.throws(()=>artifactMetadata(input,app,bytes,{...report,file:'other.apk'}),/divergente/);
 assert.throws(()=>artifactMetadata(input,app,bytes,{...report,verified:false}),/verificação binária/);
});

test('manifest declares custom signing accurately if a non-debug certificate signed it',()=>{
 const result=artifactMetadata(input,app,bytes,{...report,signingType:'custom'});
 assert.match(result.signing,/personalizada/);
 assert.equal(result.signerCertificateSha256,report.signerCertificateSha256);
});

test('QA instructions identify build identity and required tester journey',()=>{
 const instructions=qaTestInstructions(artifactMetadata(input,app,bytes,report));
 assert.ok(instructions.includes(`Versão: ${app.version} (build ${app.android.versionCode})`));
 assert.match(instructions,/APK: app-release\.apk/);
 assert.match(instructions,/SHA-256:/);
 assert.match(instructions,/Instalar a APK/);
 assert.match(instructions,/Criar publicação com foto/);
 assert.match(instructions,/Cancelar sessao pelo feed/);
 assert.match(instructions,/Verificar equipas, torneios e campeonatos/);
 assert.match(instructions,/NÃO DISPONÍVEL nesta APK/);
 assert.doesNotMatch(instructions,/GOOGLE_SERVICES_JSON|EXPO_TOKEN|private\/firebase/);
 assert.ok(instructions.split('\n').length>25);
 const push=qaTestInstructions(artifactMetadata({...input,GOOGLE_SERVICES_JSON:'/private/firebase.json'},app,bytes,report));
 assert.match(push,/confirmar receção real de uma notificação/);
 assert.doesNotMatch(push,/NÃO DISPONÍVEL nesta APK/);
});

test('Codemagic generates the manifest after release Gradle, for both workflows',()=>{
 const yaml=untranslate(fs.readFileSync(path.join(__dirname,'../codemagic.yaml'),'utf8'));
 assert.equal((yaml.match(/node scripts\/android-qa-artifact-manifest\.cjs/g)||[]).length,2);
 assert.equal((yaml.match(/build-metadata\/jynlo-android-qa\.json/g)||[]).length,2);
 assert.equal((yaml.match(/build-metadata\/LEIA-ME-JYNLO-ANDROID-QA\.txt/g)||[]).length,2);
 const flows=yaml.split(/^  jynlo-android-(?:push-)?qa:/m).slice(1);
 assert.equal(flows.length,2);
 for(const flow of flows)
  assert.ok(flow.indexOf('gradlew assembleRelease')<flow.indexOf('node scripts/android-qa-artifact-manifest.cjs'));
});
