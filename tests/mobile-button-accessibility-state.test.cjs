const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=untranslate(fs.readFileSync(path.join(__dirname,'../src/components/UI.tsx'),'utf8'));
test('shared mobile buttons announce disabled state to assistive technology',()=>{
 assert.match(source,/accessibilityRole="button" accessibilityState=\{\{disabled\}\} onPress=\{onPress\} disabled=\{disabled\}/);
 assert.match(source,/\(pressed\|\|disabled\)&&\{opacity:0\.65\}/);
});

test('shared native typography preserves readable captions and 44pt controls',()=>{
 assert.match(source,/content:\{paddingHorizontal:16,paddingTop:16/);
 assert.match(source,/eyebrow:\{fontSize:12/);
 assert.match(source,/metricKey:\{color:MobileTheme\.colors\.muted,fontSize:12/);
 assert.match(source,/messageText:\{color:C\.white,fontSize:14,lineHeight:21/);
 assert.match(source,/button:\{minHeight:52/);
});
