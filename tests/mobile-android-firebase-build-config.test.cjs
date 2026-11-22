const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {validateAndroidFirebaseConfig,prepare}=require('../scripts/prepare-android-native-config.cjs');

const fixture={
 project_info:{project_id:'jynlo-demo-test'},
 client:[{client_info:{mobilesdk_app_id:'1:1111:android:fake',
  android_client_info:{package_name:'com.jynlo.app'}}}]
};
const payload=JSON.stringify(fixture);

test('missing Firebase config is an explicit QA-only fallback',()=>{
 assert.deepEqual(prepare({}),{configured:false,reason:'not-provided'});
});

test('push-enabled workflow fails closed without its encrypted Firebase group',()=>{
 assert.throws(()=>prepare({JYNLO_REQUIRE_NATIVE_PUSH:'1'}),/exige o segredo/);
});

test('Firebase config must bind to the real Android application',()=>{
 assert.equal(validateAndroidFirebaseConfig(payload),true);
 assert.throws(()=>validateAndroidFirebaseConfig('invalid json'),/JSON inválido/);
 assert.throws(()=>validateAndroidFirebaseConfig(JSON.stringify({...fixture,client:[]})),/não corresponde/);
 assert.throws(()=>validateAndroidFirebaseConfig(JSON.stringify({
  ...fixture,client:[{client_info:{mobilesdk_app_id:'1:1111:android:fake',
   android_client_info:{package_name:'com.attacker.fake'}}}]
 })),/com\.jynlo\.app/);
});

test('base64 secret becomes a private file outside the checkout and a CM_ENV reference',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'jynlo-native-config-test-'));
 const envFile=path.join(temp,'cm.env');
 fs.writeFileSync(envFile,'');
 try{
  const outcome=prepare({JYNLO_FIREBASE_ANDROID_JSON_B64:Buffer.from(payload).toString('base64'),CM_ENV:envFile});
  assert.equal(outcome.configured,true);
  const assigned=untranslate(fs.readFileSync(envFile,'utf8'));
  assert.match(assigned,/^GOOGLE_SERVICES_JSON=\/.*\/google-services\.json\n$/);
  const destination=assigned.trim().slice('GOOGLE_SERVICES_JSON='.length);
  assert.notEqual(path.dirname(destination),process.cwd());
  assert.equal(untranslate(fs.readFileSync(destination,'utf8')),payload);
  assert.equal(fs.statSync(destination).mode&0o077,0);
  fs.rmSync(path.dirname(destination),{recursive:true,force:true});
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('invalid or conflicting secrets fail before Android prebuild',()=>{
 assert.throws(()=>prepare({JYNLO_FIREBASE_ANDROID_JSON_B64:'abc&',CM_ENV:'/tmp/file'}),/base64 inválido/);
 assert.throws(()=>prepare({
  JYNLO_FIREBASE_ANDROID_JSON_B64:Buffer.from(payload).toString('base64'),
  GOOGLE_SERVICES_JSON:'/tmp/other'
 }),/apenas uma/);
 assert.throws(()=>prepare({GOOGLE_SERVICES_JSON:'/missing/jynlo/google-services.json'}),/ficheiro válido/);
 assert.throws(()=>prepare({JYNLO_FIREBASE_ANDROID_JSON_B64:Buffer.from(payload).toString('base64')}),/CM_ENV/);
});

test('existing Expo file-variable path is validated without copying secrets',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'jynlo-native-file-test-'));
 try{
  const file=path.join(temp,'google-services.json');
  fs.writeFileSync(file,payload);
  assert.deepEqual(prepare({GOOGLE_SERVICES_JSON:file}),{configured:true});
  assert.equal(untranslate(fs.readFileSync(file,'utf8')),payload);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('Codemagic validates Firebase prior to native Expo prebuild',()=>{
 const yaml=untranslate(fs.readFileSync(path.join(__dirname,'../codemagic.yaml'),'utf8'));
 const verify=yaml.indexOf('node scripts/prepare-android-native-config.cjs');
 const prebuild=yaml.indexOf('expo prebuild --platform android');
 assert.ok(verify>0&&prebuild>verify);
 assert.match(yaml,/CM_BRANCH:-/);
 assert.match(yaml,/jynlo-android-qa:/);
 assert.match(yaml,/jynlo-android-push-qa:/);
 assert.match(yaml,/groups:\s*\n\s*- jynlo_android_native/);
 assert.match(yaml,/JYNLO_REQUIRE_NATIVE_PUSH: "1"/);
});
