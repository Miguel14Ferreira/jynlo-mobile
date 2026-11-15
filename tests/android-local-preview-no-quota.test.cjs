'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('local Windows preview APK validates HTTPS preview API without production-only store guard',()=>{
 const script=read('scripts/build-android-local.ps1');
 assert.match(script,/EXPO_PUBLIC_JYNLO_API_URL = 'https:\/\/desporto24-preview-api\.onrender\.com'/);
 assert.match(script,/JYNLO_REQUIRE_REAL_API = '1'/);
 assert.match(script,/node\.exe' @\('scripts\/verify-release\.cjs'\)/);
 assert.doesNotMatch(script,/npm\.cmd' @\('run','check:release'\)/);
 assert.match(script,/expo','prebuild/);
 assert.match(script,/:app:assembleRelease/);
 assert.match(script,/apksigner\.bat/);
 assert.doesNotMatch(script,/\beas\s+build\b/);
});

test('Firebase is optional for local preview but invalid explicitly selected credentials are rejected',()=>{
 const script=read('scripts/build-android-local.ps1');
 assert.match(script,/if \(\$firebase\)/);
 assert.match(script,/Validar configuracao Firebase Android/);
 assert.match(script,/Remove-Item Env:GOOGLE_SERVICES_JSON/);
 assert.match(script,/Sem Firebase Android: a APK de testes nao tera push remoto/);
 assert.match(script,/GOOGLE_SERVICES_JSON aponta para um ficheiro inexistente/);
 assert.match(script,/JYNLO_GOOGLE_MAPS_ANDROID_API_KEY/);
});

test('one-command local APK route cannot accidentally consume cloud build quota',()=>{
 const script=read('scripts/validate-local.ps1');
 assert.match(script,/\[switch\]\$LocalApk/);
 assert.match(script,/if \(\$LocalApk -and \$BuildApk\)/);
 assert.match(script,/if \(\$LocalApk\)/);
 assert.match(script,/build-android-local\.ps1'\) -SkipInstall -SkipChecks/);
 assert.match(script,/scripts\/verify-release\.cjs/);
 assert.doesNotMatch(script,/Invoke-Checked 'Validar configuracao API real' 'npm\.cmd' @\('run','check:release'\)/);
 assert.match(script,/if \(\$BuildApk\)/);
});
