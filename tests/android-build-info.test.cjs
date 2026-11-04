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
