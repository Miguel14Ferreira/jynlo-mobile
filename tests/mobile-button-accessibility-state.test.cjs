'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/components/UI.tsx'),'utf8');
test('shared mobile buttons announce disabled state to assistive technology',()=>{
 assert.match(source,/accessibilityRole="button" accessibilityState=\{\{disabled\}\} onPress=\{onPress\} disabled=\{disabled\}/);
 assert.match(source,/\(pressed\|\|disabled\)&&\{opacity:0\.65\}/);
});
