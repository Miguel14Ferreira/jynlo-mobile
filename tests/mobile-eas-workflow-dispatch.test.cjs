'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('EAS manual workflows use workflow_dispatch object rather than YAML null',()=>{
 for(const filename of ['.eas/workflows/mobile-preflight.yml','.eas/workflows/android-diagnostic.yml']){
  const yaml=fs.readFileSync(path.join(root,filename),'utf8');
  assert.match(yaml,/^on:\s*\n\s+workflow_dispatch:\s*\{\}/m,filename);
  assert.doesNotMatch(yaml,/^\s+workflow_dispatch:\s*$/m,filename);
  assert.match(yaml,/eas\/checkout/,filename);
 }
});
