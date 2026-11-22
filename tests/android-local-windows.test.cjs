const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('local Windows APK build uses Gradle and never consumes EAS build quota',()=>{
 const s=read('scripts/build-android-local.ps1');
 assert.match(s,/expo','prebuild/);
 assert.match(s,/:app:assembleRelease/);
 assert.match(s,/JYNLO_ANDROID_DIAGNOSTIC_NO_R8/);
 assert.match(s,/EXPO_PUBLIC_JYNLO_API_URL/);
 assert.match(s,/GOOGLE_SERVICES_JSON/);
 assert.match(s,/apksigner\.bat/);
 assert.match(s,/Push-Location \(Join-Path \$root 'android'\)/);
 assert.match(s,/dist\\android-local/);
 assert.doesNotMatch(s,/Run '[^']+' 'npx\.cmd' @\([^\n]*eas/i);
});

test('local Android build cannot accidentally commit Firebase credentials',()=>{
 const ignore=read('.gitignore');
 assert.match(ignore,/(?:^|\n)google-services\.json(?:\n|$)/);
 assert.match(ignore,/(?:^|\n)credentials\.json(?:\n|$)/);
 assert.match(ignore,/(?:^|\n)\*\.jks(?:\n|$)/);
});
