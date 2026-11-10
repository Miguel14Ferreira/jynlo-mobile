'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/android-launch-diagnostic.yml'),'utf8');

test('Android launch diagnostic accepts a specific signed APK workflow run',()=>{
 assert.match(workflow,/workflow_dispatch:\s*\n\s*inputs:/);
 assert.match(workflow,/apk_run_id:\s*\n\s*description:/);
 assert.match(workflow,/required: true/);
 assert.match(workflow,/run_id="\$\{\{ inputs\.apk_run_id \}\}"/);
 assert.match(workflow,/\[\[ ! "\$run_id" =~ \^\[1-9\]\[0-9\]\{0,17\}\$ \]\]/);
 assert.match(workflow,/gh run download "\$run_id" -R "\$GITHUB_REPOSITORY"/);
 assert.doesNotMatch(workflow,/gh run download [0-9]+ -R/);
});

test('launch diagnosis keeps its provenance and fatal Android failure artifacts',()=>{
 assert.match(workflow,/Testing signed APK from run \$run_id/);
 assert.match(workflow,/apk-build-info\.json/);
 assert.match(workflow,/adb install -r "\$APK_PATH"/);
 assert.match(workflow,/adb logcat -d -v time/);
 assert.match(workflow,/FATAL EXCEPTION/);
 assert.match(workflow,/name: jynlo-signed-apk-launch-diagnostics/);
 assert.match(workflow,/if: always\(\)/);
 assert.doesNotMatch(workflow,/eas build|assembleRelease|gradlew/);
});
