'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const os=require('node:os');
const {artifactMetadata,writeManifest}=require('../scripts/android-qa-artifact-manifest.cjs');
const app=JSON.parse(fs.readFileSync(path.join(__dirname,'..','app.json'),'utf8')).expo;
const input={
 CM_BRANCH:'develop',
 CM_COMMIT:'a'.repeat(40),
 CM_BUILD_ID:'test-build-id',
 CM_WORKFLOW_NAME:'Jynlo Android - APK de testes (develop)',
 EXPO_PUBLIC_JYNLO_API_URL:'https://desporto24-preview-api.onrender.com',
 JYNLO_APK_FILENAME:'app-release.apk'
};
const bytes=Buffer.alloc(2048,42);

test('QA APK manifest identifies exact commit, version, file checksum and backend',()=>{
 const result=artifactMetadata(input,app,bytes);
 assert.equal(result.commit,input.CM_COMMIT);
 assert.equal(result.version,app.version);
 assert.equal(result.versionCode,app.android.versionCode);
 assert.equal(result.package,'com.jynlo.app');
 assert.equal(result.backend,input.EXPO_PUBLIC_JYNLO_API_URL);
 assert.equal(result.pushConfigured,false);
 assert.equal(result.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));
 assert.match(result.signing,/debug-keystore/);
});

test('push is recorded only if native Firebase config was provided',()=>{
 assert.equal(artifactMetadata({...input,GOOGLE_SERVICES_JSON:'/private/firebase.json'},app,bytes).pushConfigured,true);
 assert.throws(()=>artifactMetadata({...input,JYNLO_REQUIRE_NATIVE_PUSH:'1'},app,bytes),/não inclui configuração Firebase/);
});

test('manifest refuses master, pull request, wrong API and unidentified commit',()=>{
 assert.throws(()=>artifactMetadata({...input,CM_BRANCH:'master'},app,bytes),/develop/);
 assert.throws(()=>artifactMetadata({...input,CM_PULL_REQUEST:'true'},app,bytes),/pull requests/);
 assert.throws(()=>artifactMetadata({...input,CM_COMMIT:'unknown'},app,bytes),/Commit Git/);
 assert.throws(()=>artifactMetadata({...input,EXPO_PUBLIC_JYNLO_API_URL:'https://evil.example'},app,bytes),/backend preview/);
});

test('manifest rejects non-Jynlo Android package even when version and branch match',()=>{
 assert.throws(()=>artifactMetadata(input,{
  ...app,android:{...app.android,package:'com.example.clone'}
 },bytes),/identidade Android oficial/);
});

test('manifest refuses empty APK and unsafe file names',()=>{
 assert.throws(()=>artifactMetadata(input,app,Buffer.from('bad')),/APK ausente/);
 assert.throws(()=>artifactMetadata({...input,JYNLO_APK_FILENAME:'../private.apk'},app,bytes),/Nome de APK inválido/);
 assert.throws(()=>artifactMetadata({...input,JYNLO_APK_FILENAME:'app.aab'},app,bytes),/Nome de APK inválido/);
});

test('APK sidecar is generated from the real output folder without secrets',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'jynlo-manifest-test-'));
 try{
  const dir=path.join(root,'android/app/build/outputs/apk/release');
  fs.mkdirSync(dir,{recursive:true});
  fs.copyFileSync(path.join(__dirname,'../app.json'),path.join(root,'app.json'));
  fs.writeFileSync(path.join(dir,'app-release.apk'),bytes);
  const output=writeManifest({...input,CM_BUILD_DIR:root,GOOGLE_SERVICES_JSON:'/private/firebase.json'});
  const sidecar=JSON.parse(fs.readFileSync(path.join(root,'build-metadata/jynlo-android-qa.json'),'utf8'));
  assert.equal(sidecar.sha256,output.sha256);
  assert.equal(sidecar.pushConfigured,true);
  assert.equal(JSON.stringify(sidecar).includes('/private/firebase.json'),false);
  assert.equal(JSON.stringify(sidecar).includes('JYNLO_FIREBASE_ANDROID_JSON_B64'),false);
 }finally{fs.rmSync(root,{force:true,recursive:true});}
});

test('Codemagic generates the manifest after release Gradle, for both workflows',()=>{
 const yaml=fs.readFileSync(path.join(__dirname,'../codemagic.yaml'),'utf8');
 assert.equal((yaml.match(/node scripts\/android-qa-artifact-manifest\.cjs/g)||[]).length,2);
 assert.equal((yaml.match(/build-metadata\/jynlo-android-qa\.json/g)||[]).length,2);
 const flows=yaml.split(/^  jynlo-android-(?:push-)?qa:/m).slice(1);
 assert.equal(flows.length,2);
 for(const flow of flows)
  assert.ok(flow.indexOf('gradlew assembleRelease')<flow.indexOf('node scripts/android-qa-artifact-manifest.cjs'));
});
