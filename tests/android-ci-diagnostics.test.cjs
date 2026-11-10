'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/mobile-code-checks.yml'),'utf8');

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
  const i=workflow.indexOf(command+' 2>&1 | tee');
  assert.ok(i>=0,'missing captured command '+command);
  const previous=workflow.slice(Math.max(0,i-140),i);
  assert.match(previous,/set -o pipefail/);
 }
 assert.doesNotMatch(workflow,/continue-on-error:\s*true/);
});
