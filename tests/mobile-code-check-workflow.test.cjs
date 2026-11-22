const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../.github/workflows/mobile-code-checks.yml'),'utf8'));

test('develop checks run code validation without generating a paid Android build',()=>{
 assert.match(source,/name: Jynlo Mobile - Code Checks/);
 assert.match(source,/^on:\s*\n  workflow_dispatch:/m);
 assert.match(source,/workflow_dispatch:/);
 assert.match(source,/npm run typecheck/);
 assert.match(source,/npm run test:all/);
 assert.match(source,/npx expo export --platform android --output-dir/);
 assert.match(source,/cancel-in-progress: true/);
 assert.doesNotMatch(source,/eas build|gradlew|assembleRelease|expo prebuild/);
});
test('develop checks reject demo mode before code validation',()=>{
 assert.match(source,/name: Verify real API release configuration/);
 assert.match(source,/EXPO_PUBLIC_JYNLO_API_URL: https:\/\/desporto24-preview-api\.onrender\.com/);
 assert.match(source,/JYNLO_REQUIRE_REAL_API: '1'/);
 assert.match(source,/npm run check:release 2>&1 \| tee/);
 assert.ok(source.indexOf('npm run check:release 2>&1 | tee')<
           source.indexOf('npm run typecheck 2>&1 | tee'));
});

test('Android bundle validates imports with the real Jynlo backend, without Gradle',()=>{
 assert.match(source,/name: Bundle Android JavaScript without native build/);
 assert.match(source,/EXPO_PUBLIC_JYNLO_API_URL: https:\/\/desporto24-preview-api\.onrender\.com/);
 assert.ok(source.indexOf('npm run test:all 2>&1 | tee')<
           source.indexOf('npx expo export --platform android --output-dir'));
 assert.doesNotMatch(source,/npx eas build|\.\/gradlew|assembleRelease/);
});

test('local validation replaces automatic GitHub code checks while quota is exhausted',()=>{
 const local=untranslate(fs.readFileSync(path.join(__dirname,'../scripts/validate-local.ps1'),'utf8'));
 assert.doesNotMatch(source,/^  push:/m);
 assert.match(source,/workflow_dispatch:/);
 assert.match(local,/Invoke-Checked 'Verificar TypeScript'/);
 assert.match(local,/Invoke-Checked 'Validar sintaxe e contratos Node'/);
 assert.match(local,/JYNLO_REQUIRE_REAL_API/);
 assert.doesNotMatch(source,/gradlew|assembleRelease|eas build/);
});
