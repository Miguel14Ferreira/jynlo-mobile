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

test('signed APK validation aborts on the first failed regression, TypeScript or release check',()=>{
 const start=workflow.indexOf('      - name: Validar testes, TypeScript e API real');
 const end=workflow.indexOf('      - name: Gerar Android nativo',start);
 assert.ok(start>=0&&end>start,'signed validation step must exist');
 const validation=workflow.slice(start,end);
 assert.match(validation,/set -euo pipefail/);
 for(const command of [
  'npm run test:all 2>&1 | tee android-build-diagnostics/tests.log',
  'npm run typecheck 2>&1 | tee android-build-diagnostics/typescript.log',
  'npm run check:release 2>&1 | tee android-build-diagnostics/release-check.log'
 ])assert.ok(validation.includes(command),'missing or uncaptured validation: '+command);
 assert.ok(validation.indexOf('npm run test:all')<validation.indexOf('npm run typecheck'));
 assert.ok(validation.indexOf('npm run typecheck')<validation.indexOf('npm run check:release'));
});

test('internal signed APK cannot be generated from non-develop refs',()=>{
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/if: \$\{\{ github\.ref == 'refs\/heads\/develop' && inputs\.confirm == 'TESTAR_API_REAL' \}\}/);
 assert.doesNotMatch(workflow,/github\.event_name == 'push' \|\| inputs\.confirm/);
});
