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
 assert.match(workflow,/run_id="\$\{\{ github\.event\.workflow_run\.id \|\| inputs\.apk_run_id \}\}"/);
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


test('launch diagnostic does not count normal process mentions as fatal, and captures monkey failures',()=>{
 assert.match(workflow,/adb shell monkey -p com\.jynlo\.app 1 > launch-diagnostics\/launch\.txt 2>&1 \|\| true/);
 assert.match(workflow,/crashes = \[l for l in lines if 'FATAL EXCEPTION' in l or 'Fatal signal' in l\]/);
 assert.doesNotMatch(workflow,/or 'Process: com\.jynlo\.app'/);
});

test('a successful signed APK build on develop automatically triggers its own launch check',()=>{
 assert.match(workflow,/workflow_run:\s*\n\s*workflows: \['Jynlo Mobile - Android APK assinada \(testes internos\)'\]/);
 assert.match(workflow,/types: \[completed\]/);
 assert.match(workflow,/branches: \[develop\]/);
 assert.match(workflow,/github\.event\.workflow_run\.conclusion == 'success'/);
 assert.match(workflow,/github\.event\.workflow_run\.head_repository\.full_name == github\.repository/);
 assert.match(workflow,/github\.event\.workflow_run\.id \|\| inputs\.apk_run_id/);
 assert.match(workflow,/Source run: https:\/\/github\.com\/\$GITHUB_REPOSITORY\/actions\/runs\/\$run_id/);
});

test('startup cannot succeed from a stale activity-history entry or an exited process',()=>{
 assert.match(workflow,/adb shell pidof com\.jynlo\.app > launch-diagnostics\/pid\.txt \|\| true/);
 assert.match(workflow,/if not pid or not all\(part\.isdigit\(\) for part in pid\.split\(\)\):/);
 assert.match(workflow,/topResumedActivity=/);
 assert.match(workflow,/mResumedActivity:/);
 assert.match(workflow,/if not any\('com\.jynlo\.app\/' in line for line in resumed\):/);
 assert.match(workflow,/resumed-activity\.txt/);
 assert.doesNotMatch(workflow,/if 'com\.jynlo\.app' not in activity:/);
});
