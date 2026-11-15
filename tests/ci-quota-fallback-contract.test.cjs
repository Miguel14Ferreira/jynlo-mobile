'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('ordinary develop commits do not start unavailable GitHub-hosted contract runners',()=>{
 const contracts=read('.github/workflows/mobile-contracts.yml');
 assert.match(contracts,/workflow_dispatch:/);
 assert.doesNotMatch(contracts,/^\s+push:/m);
 assert.doesNotMatch(contracts,/^\s+pull_request:/m);
 const quality=read('.github/workflows/mobile-quality.yml');
 assert.match(quality,/paths:\s*\['\.github\/workflows\/mobile-quality.yml'\]/);
});
test('local Windows validation covers release guard, TypeScript and all contracts without an APK',()=>{
 const ps=read('scripts/validate-local.ps1');
 // Local validation calls the same release guard directly, rather than the
 // stricter production-store npm alias that rejects the preview environment.
 assert.match(ps,/scripts\/verify-release\.cjs/);
 assert.match(ps,/scripts\/check-eas-project\.cjs/);
 for(const stage of ['typecheck','test:all'])
  assert.ok(ps.includes(stage),stage+' missing from offline fallback');
 assert.match(ps,/\[switch\]\$NoInstall/);
 assert.match(ps,/\[switch\]\$Bundle/);
 assert.match(ps,/\[switch\]\$BuildApk/);
 assert.match(ps,/if \(\$BuildApk\)/);
 assert.match(ps,/CONSTRUIR_APK/);
});
