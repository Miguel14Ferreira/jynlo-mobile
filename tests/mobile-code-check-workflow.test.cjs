'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../.github/workflows/mobile-code-checks.yml'),'utf8');

test('develop checks run code validation without generating a paid Android build',()=>{
 assert.match(source,/name: Jynlo Mobile - Code Checks/);
 assert.match(source,/push:\s*\n\s*branches: \[develop\]/);
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
 assert.match(source,/run: npm run check:release/);
 assert.ok(source.indexOf('run: npm run check:release')<source.indexOf('run: npm run typecheck'));
});

test('Android bundle validates imports with the real Jynlo backend, without Gradle',()=>{
 assert.match(source,/name: Bundle Android JavaScript without native build/);
 assert.match(source,/EXPO_PUBLIC_JYNLO_API_URL: https:\/\/desporto24-preview-api\.onrender\.com/);
 assert.ok(source.indexOf('run: npm run test:all')<source.indexOf('run: npx expo export --platform android'));
 assert.doesNotMatch(source,/npx eas build|\.\/gradlew|assembleRelease/);
});
