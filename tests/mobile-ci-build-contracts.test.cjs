const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.join(__dirname,'..');
const read=p=>untranslate(fs.readFileSync(path.join(base,p),'utf8'));
const ci=read('.github/workflows/mobile-develop-integration.yml');
const workflow=read('codemagic.yaml');
const packageJson=JSON.parse(read('package.json'));

test('CI exercises all mobile regressions in develop without using master',()=>{
 // Hosted GitHub Actions have exhausted their quota: the workflow stays
 // dispatch-only until runners are available, rather than failing on pushes.
 assert.match(ci,/workflow_dispatch:/);
 assert.doesNotMatch(ci,/^\s+push:/m);
 assert.match(read('.circleci/config.yml'),/only: develop/);
 assert.match(read('.circleci/config.yml'),/run_validation/);
 assert.match(ci,/node --test tests\/\*\.test\.cjs/);
 assert.match(ci,/npm run typecheck/);
 assert.match(ci,/npm run test:all/);
 assert.doesNotMatch(ci,/branches: \[master\]/);
});

test('setup-node never requires an absent npm lockfile',()=>{
 const hasLock=fs.existsSync(path.join(base,'package-lock.json'))||
  fs.existsSync(path.join(base,'npm-shrinkwrap.json'));
 if(!hasLock){
  assert.doesNotMatch(ci,/cache:\s*npm/);
  assert.doesNotMatch(ci,/cache-dependency-path:/);
  assert.match(ci,/npm install --no-audit --no-fund --ignore-scripts/);
 }
});

test('CI and Codemagic agree on native and TypeScript preflight',()=>{
 for(const source of [ci,workflow]){
  assert.match(source,/npm run typecheck/);
  assert.match(source,/npm run test:all/);
  assert.match(source,/scripts\/check-eas-project\.cjs/);
  assert.match(source,/scripts\/verify-release\.cjs/);
 }
 assert.match(workflow,/expo prebuild --platform android --no-install/);
 assert.match(workflow,/node scripts\/prepare-android-native-config\.cjs/);
 assert.match(workflow,/\.\/gradlew assembleRelease --no-daemon/);
 assert.match(workflow,/CM_BRANCH:-/);
});

test('APK preview and push-enabled builds remain separate and require development backend',()=>{
 assert.match(workflow,/jynlo-android-qa:/);
 assert.match(workflow,/jynlo-android-push-qa:/);
 assert.match(workflow,/JYNLO_REQUIRE_NATIVE_PUSH: "1"/);
 assert.match(workflow,/jynlo_android_native/);
 assert.match(workflow,/desporto24-preview-api\.onrender\.com/);
 assert.doesNotMatch(workflow,/EAS_BUILD_PROFILE: production/);
 assert.ok(packageJson.scripts['test:all']?.includes('node --test tests/*.test.cjs'));
});
