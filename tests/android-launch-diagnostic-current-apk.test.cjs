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
 assert.match(workflow,/Testing verified signed APK from run \$run_id/);
 assert.match(workflow,/apk-build-info\.json/);
 assert.match(workflow,/adb install -r "\$APK_PATH"/);
 assert.match(workflow,/adb logcat -d -v threadtime/);
 assert.match(workflow,/FATAL EXCEPTION/);
 assert.match(workflow,/name: jynlo-signed-apk-launch-diagnostics/);
 assert.match(workflow,/if: always\(\)/);
 assert.doesNotMatch(workflow,/eas build|assembleRelease|gradlew/);
});


test('launch diagnostic does not count normal process mentions as fatal, and captures monkey failures',()=>{
 assert.match(workflow,/adb shell monkey -p com\.jynlo\.app 1 > launch-diagnostics\/launch\.txt 2>&1 \|\| true/);
 assert.match(workflow,/fatal_indices = \[i for i, line in enumerate\(lines\)/);
 assert.match(workflow,/if 'FATAL EXCEPTION' in line or 'Fatal signal' in line/);
 assert.match(workflow,/Process: com\.jynlo\.app,/);
 assert.match(workflow,/>>> com\.jynlo\.app <<</);
 assert.match(workflow,/crashes\.append\('\\n'\.join\(context\)\)/);
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


test('failed screenshot capture cannot hide crash logs and diagnostic summary',()=>{
 const screenshot=workflow.indexOf('if ! adb exec-out screencap -p > launch-diagnostics/launch.png; then');
 const analysis=workflow.indexOf("python3 - <<'PY'");
 assert.ok(screenshot>=0 && analysis>screenshot);
 assert.match(workflow,/screenshot-warning\.txt/);
 assert.match(workflow,/if \[ ! -s launch-diagnostics\/launch\.png \]; then/);
 assert.doesNotMatch(workflow,/test -s launch-diagnostics\/launch\.png/);
 assert.match(workflow,/crash-summary\.txt/);
});

test('a Jynlo React Native JS error fails launch smoke despite a live Android process',()=>{
 assert.match(workflow,/app_pids = \{part for part in \(pid \+ ' ' \+ initial_pid\)\.split\(\) if part\.isdigit\(\)\}/);
 assert.match(workflow,/E\\s\+ReactNativeJS/);
 assert.match(workflow,/match\.group\(1\) in app_pids/);
 assert.match(workflow,/js_errors\.append\(line\)/);
 assert.match(workflow,/launch-diagnostics\/js-errors\.txt/);
 assert.match(workflow,/if js_errors:/);
 assert.match(workflow,/Jynlo raised a severe React Native JS error after launch/);
 assert.doesNotMatch(workflow,/retention-days: 7[\s\S]*?, line\)/);
});

test('native LiveKit-style fatal signals are attributed to Jynlo without Java Process headers',()=>{
 assert.match(workflow,/jynlo_native_signal = \('Fatal signal' in lines\[i\] and/);
 assert.match(workflow,/\(com\.jynlo\.app\)/);
 assert.match(workflow,/if jynlo_native_signal or any\(/);
});

test('concurrent fatal incidents are isolated before assigning process identity',()=>{
 assert.match(workflow,/next_fatal = next\(\(j for j in fatal_indices if j > i\), len\(lines\)\)/);
 assert.match(workflow,/context = lines\[i:min\(i\+60, next_fatal\)\]/);
 assert.doesNotMatch(workflow,/context = lines\[max\(0, i-5\):/);
});

test('fatal incident summary preserves stack traces and separates concurrent crashes',()=>{
 assert.match(workflow,/crashes\.append\('\\n'\.join\(context\)\)/);
 assert.match(workflow,/--- next fatal incident ---/);
 assert.match(workflow,/print\(incident\[:2500\]\)/);
 assert.match(workflow,/context = lines\[i:min\(i\+60, next_fatal\)\]/);
});

test('emulator refuses stale or corrupted signed APK before installing',()=>{
 const download=workflow.slice(workflow.indexOf('      - name: Download exact signed APK'),workflow.indexOf('      - name: Boot Android emulator'));
 assert.match(download,/gh run view "\$run_id" -R "\$GITHUB_REPOSITORY" --json headSha,headBranch,conclusion,name/);
 assert.match(download,/run\.get\('conclusion'\) != 'success'/);
 assert.match(download,/run\.get\('headBranch'\) != 'develop'/);
 assert.match(download,/info\.get\('gitCommit'\) != run\.get\('headSha'\)/);
 assert.match(download,/info\.get\('format'\) != 'apk'/);
 assert.match(download,/info\.get\('packageName'\) != 'com\.jynlo\.app'/);
 assert.match(download,/info\.get\('apiUrl'\) != 'https:\/\/desporto24-preview-api\.onrender\.com'/);
 assert.match(download,/sha256sum -c android-build-sha256\.txt/);
 assert.ok(download.indexOf('sha256sum -c')<workflow.indexOf('adb install -r'));
});

test('startup JS exceptions are collected even if the app exits before the final PID check',()=>{
 assert.match(workflow,/adb shell pidof com\.jynlo\.app > launch-diagnostics\/initial-pid\.txt \|\| true/);
 assert.match(workflow,/initial_pid = Path\('launch-diagnostics\/initial-pid\.txt'\)\.read_text\(\)\.strip\(\)/);
 assert.match(workflow,/app_pids = \{part for part in \(pid \+ ' ' \+ initial_pid\)\.split\(\) if part\.isdigit\(\)\}/);
 const jsCheck=workflow.indexOf("if js_errors:");
 const deadProcessCheck=workflow.indexOf("if not pid or not all(part.isdigit() for part in pid.split()):");
 assert.ok(jsCheck>=0 && deadProcessCheck>jsCheck,
  'inspect fatal ReactNativeJS errors before reporting an exited Android process');
});
