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
 for(const step of ['npm run check:release','npm run typecheck','npm run test:all',
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
 for(const check of ['npm run check:release','npm run typecheck','npm run test:all',
  'npx expo export --platform android','npx expo prebuild --platform android --no-install --clean'])
  assert.ok(preflight.includes(check),check);
 assert.doesNotMatch(workflow,/type: submit|profile: production/);
});
