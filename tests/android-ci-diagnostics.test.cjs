const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const workflow=untranslate(fs.readFileSync(path.join(__dirname,'../.github/workflows/mobile-code-checks.yml'),'utf8'));

test('Android CI retains failure evidence for each validation stage',()=>{
 for(const label of ['jynlo-install.log','jynlo-release-check.log','jynlo-typescript.log','jynlo-tests.log','jynlo-android-bundle.log']){
  assert.match(workflow,new RegExp('tee .*'+label.replaceAll('.','\\.')));
  assert.ok(workflow.includes('${{ runner.temp }}/'+label),'missing artifact '+label);
 }
 assert.match(workflow,/if: failure\(\)/);
 assert.match(workflow,/uses: actions\/upload-artifact@v4/);
 assert.match(workflow,/retention-days: 7/);
});

test('capturing logs cannot turn a failed Android validation into a green job',()=>{
 const commands=['npm install --ignore-scripts --no-audit --no-fund','npm run check:release','npm run typecheck','npm run test:all','npx expo export --platform android'];
 for(const command of commands){
  // Expo export legitimately has --output-dir after --platform android.
  // Inspect the complete command line rather than requiring tee immediately
  // after the short command prefix.
  const matchingLines=workflow.split('\n').filter(line=>line.includes(command));
  assert.equal(matchingLines.length,1,'expected exactly one command: '+command);
  assert.match(matchingLines[0],/ 2>&1 \| tee "\$RUNNER_TEMP\/jynlo-[a-z-]+\.log"$/);
  const i=workflow.indexOf(matchingLines[0]);
  const previous=workflow.slice(Math.max(0,i-140),i);
  assert.match(previous,/set -o pipefail/);
 }
 assert.doesNotMatch(workflow,/continue-on-error:\s*true/);
});
