const test=require('node:test');
const assert=require('node:assert/strict');
const config=require('../app.json');
const {buildInfo}=require('../scripts/write-android-build-info.cjs');
const sha='abcdef0123456789abcdef0123456789abcdef01';
const env={GITHUB_SHA:sha,EXPO_PUBLIC_JYNLO_API_URL:'https://desporto24-preview-api.onrender.com',JYNLO_PLAY_UPLOAD_STORE_PASSWORD:'NEVER_SHOW'};
test('APK provenance identifies precise source without exposing secrets',()=>{
 const info=buildInfo(config,env,'apk');
 assert.equal(info.gitCommit,sha);
 assert.equal(info.versionCode,config.expo.android.versionCode);
 assert.equal(info.packageName,'com.jynlo.app');
 assert.equal(info.distribution,'internal-android-test');
 assert.ok(!JSON.stringify(info).includes('NEVER_SHOW'));
});
test('AAB provenance is explicitly marked for internal Play testing',()=>{
 assert.equal(buildInfo(config,env,'aab').distribution,'google-play-internal');
});
test('Fail closed on invalid SHA, API and package name',()=>{
 assert.throws(()=>buildInfo(config,{...env,GITHUB_SHA:'short'},'apk'));
 assert.throws(()=>buildInfo(config,{...env,EXPO_PUBLIC_JYNLO_API_URL:'http://example.com'},'apk'));
 assert.throws(()=>buildInfo({expo:{...config.expo,android:{...config.expo.android,package:'com.other.app'}}},env,'apk'));
});

test('APK and AAB workflows publish SHA-256 checksums beside build metadata',()=>{
 const fs=require('node:fs');
 const path=require('node:path');
 for(const [workflow,extension] of [['build-android-integrated-apk.yml','apk'],['build-play-internal-aab.yml','aab']]){
   const y=fs.readFileSync(path.join(__dirname,'../.github/workflows',workflow),'utf8');
   assert.ok(y.includes('app-release.'+extension+'\" > android-build-sha256.txt'),workflow+' missing checksum command');
   assert.match(y,/android-build-sha256\.txt/);
   assert.match(y,/android-build-info\.json/);
 }
});
