'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/build-android-signed-apk.yml'),'utf8');

test('failed signed APK exposes full stage logs as downloadable evidence',()=>{
 const logs=['install.log','tests.log','typescript.log','release-check.log','expo-prebuild.log','gradle-assemble.log'];
 for(const file of logs){
  assert.match(workflow,new RegExp('tee (?:\\.\\.\\/)?android-build-diagnostics\\/'+file.replaceAll('.','\\.')));
 }
 assert.match(workflow,/name: Guardar diagnóstico da compilação falhada/);
 assert.match(workflow,/if: failure\(\)/);
 assert.match(workflow,/path: android-build-diagnostics\//);
});

test('log capture does not turn tests, prebuild or Gradle failures into successful builds',()=>{
 const lines=workflow.split('\n');
 for(const marker of ['npm install --no-audit --no-fund','npm run test:all','npm run typecheck','npm run check:release',
                      'npx expo prebuild --platform android --no-install --clean',
                      './gradlew :app:assembleRelease --no-daemon --max-workers=2']){
  const line=lines.findIndex(value=>value.includes(marker+' 2>&1 | tee'));
  assert.ok(line>0,'missing captured build step '+marker);
  const previous=lines.slice(Math.max(0,line-5),line).join('\n');
  assert.match(previous,/set -o pipefail/);
 }
 assert.doesNotMatch(workflow,/continue-on-error:\s*true/);
});

test('diagnostic signed APK refuses unsafe LiveKit JNI suppression and retains signature validation',()=>{
 assert.match(workflow,/minifyEnabled false/);
 assert.match(workflow,/shrinkResources false/);
 assert.match(workflow,/if grep -qF -- '-dontwarn livekit\.org\.jni_zero\.JniZeroJni'/);
 assert.match(workflow,/apksigner/);
 assert.match(workflow,/name: jynlo-mobile-signed-internal-apk/);
});
