const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const eas=JSON.parse(untranslate(fs.readFileSync(path.join(root,'eas.json'),'utf8')));
const app=JSON.parse(untranslate(fs.readFileSync(path.join(root,'app.json'),'utf8'))).expo;
test('TestFlight is a store-signed iOS build, separate from Android diagnostics',()=>{
 const ios=eas.build['ios-testflight'];
 assert.equal(ios.distribution,'store');
 assert.equal(ios.environment,'production');
 assert.ok(!Object.prototype.hasOwnProperty.call(ios.env,'EXPO_PUBLIC_JYNLO_API_URL'),
  'Use the configured production API from EAS production environment, not hardcoded preview');
 assert.equal(ios.env.JYNLO_REQUIRE_REAL_API,'1');
 assert.ok(!('JYNLO_ANDROID_DIAGNOSTIC_NO_R8' in ios.env));
 assert.equal(eas.build.diagnostic.android.buildType,'apk');
 assert.equal(eas.build.diagnostic.env.JYNLO_ANDROID_DIAGNOSTIC_NO_R8,'1');
 assert.equal(app.ios.bundleIdentifier,'com.jynlo.app');
 assert.equal(app.version,'0.18.2');
 assert.equal(app.ios.buildNumber,'2');
 assert.equal(app.android.versionCode,17,'Closed testing update 0.18.2 (14 was the first closed testing build)');
 assert.ok(Object.prototype.hasOwnProperty.call(eas.submit,'ios-testflight'));
});

test('iOS TestFlight blocks preview API without asking for Android Maps/Firebase secrets',()=>{
 const {spawnSync}=require('node:child_process');
 const script=path.join(root,'scripts/verify-release.cjs');
 const run=url=>spawnSync(process.execPath,[script],{
  encoding:'utf8',env:{...process.env,EAS_BUILD_PROFILE:'ios-testflight',
    EXPO_PUBLIC_JYNLO_API_URL:url,JYNLO_REQUIRE_REAL_API:'1',
    GOOGLE_SERVICES_JSON:'',JYNLO_GOOGLE_MAPS_ANDROID_API_KEY:''}
 });
 for(const url of ['','https://desporto24-preview-api.onrender.com','https://staging-api.example.org']){
  const rejected=run(url);
  assert.notEqual(rejected.status,0,url||'missing production API');
  assert.match(rejected.stderr,/BUILD BLOQUEADO/);
 }
 const valid=run('https://api.d24sports.com');
 assert.equal(valid.status,0,valid.stderr);
 assert.match(valid.stdout,/OK \(api\)/);
});

test('Codemagic iOS workflow uses production API credentials and signs only validated builds',()=>{
 const yaml=untranslate(fs.readFileSync(path.join(root,'codemagic.yaml'),'utf8'));
 const start=yaml.indexOf('  jynlo-ios-testflight:');
 const stop=yaml.indexOf('\n# Diagnostic-only:',start);
 assert.ok(start>=0&&stop>start,'Missing isolated Codemagic TestFlight workflow');
 const ios=yaml.slice(start,stop);
 assert.match(ios,/app_store_connect: apple/);
 assert.match(ios,/distribution_type: app_store/);
 assert.match(ios,/bundle_identifier: com\.jynlo\.app/);
 assert.match(ios,/groups:\s*\n\s*- jynlo_play_release/);
 assert.match(ios,/EAS_BUILD_PROFILE: "ios-testflight"/);
 assert.match(ios,/node scripts\/verify-release\.cjs/);
 assert.match(ios,/npm run typecheck/);
 assert.match(ios,/npm run test:all/);
 assert.match(ios,/xcode-project use-profiles/);
 assert.match(ios,/xcode-project build-ipa/);
 assert.doesNotMatch(ios,/EXPO_PUBLIC_JYNLO_API_URL: "https:\/\/desporto24-preview-api\.onrender\.com"/);
 assert.match(ios,/submit_to_testflight: false/);
 assert.match(ios,/submit_to_app_store: false/);
});
