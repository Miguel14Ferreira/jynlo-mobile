'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const configure=require('../app.config.js');
const base={plugins:[],android:{},extra:{}};
const mapsKey='AIza'+'a'.repeat(35);
function withEnvironment(values,fn){
 const keys=['EAS_BUILD_PROFILE','JYNLO_GOOGLE_MAPS_ANDROID_API_KEY','GOOGLE_SERVICES_JSON','JYNLO_ANDROID_DIAGNOSTIC_NO_R8'];
 const before=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 try{
  for(const key of keys)delete process.env[key];
  for(const [key,value] of Object.entries(values))process.env[key]=value;
  return fn();
 }finally{
  for(const key of keys){
   if(before[key]===undefined)delete process.env[key];
   else process.env[key]=before[key];
  }
 }
}
test('Google Play build requires Firebase client configuration',()=>{
 for(const profile of ['production','play-internal']){
  withEnvironment({EAS_BUILD_PROFILE:profile,JYNLO_GOOGLE_MAPS_ANDROID_API_KEY:mapsKey},()=>{
   assert.throws(()=>configure({config:base}),/GOOGLE_SERVICES_JSON/);
  });
 }
});
test('configured Google Play build preserves Firebase path without bundling secrets in git',()=>{
 withEnvironment({EAS_BUILD_PROFILE:'play-internal',JYNLO_GOOGLE_MAPS_ANDROID_API_KEY:mapsKey,GOOGLE_SERVICES_JSON:'/tmp/google-services.json'},()=>{
  const result=configure({config:base});
  assert.equal(result.android.googleServicesFile,'/tmp/google-services.json');
  assert.equal(result.extra.nativePushConfigured,true);
 });
});
test('preview APK remains buildable for diagnosis without Firebase',()=>{
 withEnvironment({EAS_BUILD_PROFILE:'preview'},()=>{
  const result=configure({config:base});
  assert.equal(result.extra.nativePushConfigured,false);
 });
});
