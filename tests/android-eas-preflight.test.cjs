'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'../.eas/workflows',name),'utf8');

test('Expo independent preflight is manual, private and verifies real API usage',()=>{
 const workflow=read('mobile-preflight.yml');
 assert.match(workflow,/on:\s*\n\s*workflow_dispatch:/);
 assert.doesNotMatch(workflow,/on:\s*\n\s*push:/);
 assert.match(workflow,/uses: eas\/checkout/);
 assert.match(workflow,/uses: eas\/install_node_modules/);
 assert.match(workflow,/EXPO_PUBLIC_JYNLO_API_URL: https:\/\/desporto24-preview-api\.onrender\.com/);
 assert.match(workflow,/JYNLO_REQUIRE_REAL_API: '1'/);
 for(const step of ['node scripts/verify-release.cjs','npm run typecheck','npm run test:all',
  'npx expo export --platform android',
  'npx expo prebuild --platform android --no-install --clean'])
  assert.ok(workflow.includes(step),step);
});

test('EAS diagnostic APK is gated by all code, native and bundle validations',()=>{
 const workflow=read('android-diagnostic.yml');
 assert.match(workflow,/on:\s*\n\s*workflow_dispatch:/);
 assert.match(workflow,/mobile_preflight:/);
 assert.match(workflow,/needs: \[mobile_preflight\]/);
 assert.match(workflow,/type: build/);
 assert.match(workflow,/profile: diagnostic/);
 const preflight=workflow.slice(workflow.indexOf('  mobile_preflight:'),workflow.indexOf('  android_diagnostic:'));
 for(const check of ['node scripts/verify-release.cjs','npm run typecheck','npm run test:all',
  'npx expo export --platform android','npx expo prebuild --platform android --no-install --clean'])
  assert.ok(preflight.includes(check),check);
 assert.doesNotMatch(workflow,/type: submit|profile: production/);
});

test('EAS custom preflight and diagnostic build share the preview environment',()=>{
 const standalone=read('mobile-preflight.yml');
 const diagnostic=read('android-diagnostic.yml');
 assert.match(standalone,/mobile_preflight:[\s\S]*?environment: preview/);
 assert.match(diagnostic,/mobile_preflight:[\s\S]*?environment: preview/);
 assert.match(diagnostic,/android_diagnostic:[\s\S]*?environment: preview/);
 const preflight=diagnostic.slice(diagnostic.indexOf('  mobile_preflight:'),diagnostic.indexOf('  android_diagnostic:'));
 const build=diagnostic.slice(diagnostic.indexOf('  android_diagnostic:'));
 assert.ok(preflight.includes('environment: preview'));
 // A staging API is expected in EAS preview; store build guards remain strict.
 assert.doesNotMatch(standalone,/run:\\s*npm run check:release/);
 assert.doesNotMatch(preflight,/run:\\s*npm run check:release/);
 assert.ok(build.includes('environment: preview'));
 assert.doesNotMatch(standalone,/environment: production/);
 assert.doesNotMatch(diagnostic,/environment: production/);
});

test('direct diagnostic EAS builds use the same preview environment as the workflow',()=>{
 const eas=require('../eas.json');
 const diagnostic=eas.build.diagnostic;
 assert.equal(diagnostic.environment,'preview');
 assert.equal(diagnostic.distribution,'internal');
 assert.equal(diagnostic.android.buildType,'apk');
 assert.equal(diagnostic.env.JYNLO_REQUIRE_REAL_API,'1');
 assert.equal(diagnostic.env.EXPO_PUBLIC_JYNLO_API_URL,'https://desporto24-preview-api.onrender.com');
});

test('Play builds preserve the WorkManager Room database name used during Android startup',()=>{
 const config=require('../app.config.js');
 const configured=config({config:{plugins:[],android:{},extra:{}}});
 const buildProperties=configured.plugins.find(plugin=>Array.isArray(plugin)&&plugin[0]==='expo-build-properties');
 assert.ok(buildProperties,'Android build properties plugin must be configured');
 const rules=buildProperties[1].android.extraProguardRules;
 assert.match(rules,/-keep class androidx\.work\.impl\.WorkDatabase \{ \*; \}/);
 assert.match(rules,/-keep class androidx\.work\.impl\.WorkDatabase_Impl \{ \*; \}/);
 assert.match(rules,/-keep class livekit\.org\.jni_zero\.JniInit \{ \*; \}/);
 assert.ok(rules.includes('-keep class * extends androidx.room.RoomDatabase { public <init>(); }'));
 assert.ok(rules.includes('-keep class * extends androidx.work.InputMerger { public <init>(); }'));
});

test('Play corrective build disables native shrinking without weakening API or project guards',()=>{
 const config=require('../app.config.js');
 const oldProfile=process.env.EAS_BUILD_PROFILE;
 const oldMaps=process.env.JYNLO_GOOGLE_MAPS_ANDROID_API_KEY;
 try{
  process.env.EAS_BUILD_PROFILE='play-internal';
  process.env.JYNLO_GOOGLE_MAPS_ANDROID_API_KEY='AIza'+'A'.repeat(35);
  const built=config({config:{plugins:[],android:{package:'com.jynlo.app'},extra:{}}});
  const properties=built.plugins.find(p=>Array.isArray(p)&&p[0]==='expo-build-properties')[1].android;
  assert.equal(properties.enableMinifyInReleaseBuilds,false);
  assert.equal(properties.enableShrinkResourcesInReleaseBuilds,false);
  assert.equal(built.android.package,'com.jynlo.app');
  assert.equal(built.extra.eas.projectId,'5628b5c4-513a-4b82-b0fb-7a50cace5cb6');
 }finally{
  if(oldProfile===undefined)delete process.env.EAS_BUILD_PROFILE;
  else process.env.EAS_BUILD_PROFILE=oldProfile;
  if(oldMaps===undefined)delete process.env.JYNLO_GOOGLE_MAPS_ANDROID_API_KEY;
  else process.env.JYNLO_GOOGLE_MAPS_ANDROID_API_KEY=oldMaps;
 }
});

test('preview APK disables R8 after confirmed WorkManager WorkDatabase startup crash',()=>{
 const eas=require('../eas.json');
 const preview=eas.build.preview;
 const diagnostic=eas.build.diagnostic;
 const production=eas.build.production;
 assert.equal(preview.android.buildType,'apk');
 assert.equal(preview.environment,'preview');
 assert.equal(preview.env.JYNLO_REQUIRE_REAL_API,'1');
 assert.equal(preview.env.JYNLO_ANDROID_DIAGNOSTIC_NO_R8,'1');
 assert.equal(diagnostic.env.JYNLO_ANDROID_DIAGNOSTIC_NO_R8,'1');
 assert.equal(production.env?.JYNLO_ANDROID_DIAGNOSTIC_NO_R8,undefined);
});
