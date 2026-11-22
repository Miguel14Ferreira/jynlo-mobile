const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const screen=untranslate(fs.readFileSync(path.join(__dirname,'..','app','sessions','create.tsx'),'utf8'));

test('suggested custom sport options use correctly closed Pressable elements',()=>{
 assert.doesNotMatch(screen,/<\/Press(?:\s|>)/);
 assert.match(screen,/customMatches\.map\(s=><Pressable[\s\S]*?<\/Pressable>\)/);
});

test('custom sport selector validates before changing wizard step and resets on a new session',()=>{
 assert.match(screen,/if\(customSportMode&&!customSportValid\)/);
 assert.match(screen,/if\(!customSportMode&&!SPORTS\.includes\(form\.sport\)\)/);
 assert.match(screen,/setShowSportResults\(false\);setCustomSportMode\(false\)/);
 assert.match(screen,/accessibilityLabel="Nome da modalidade personalizada"/);
 assert.match(screen,/isValidCustomSport\(form\.sport\.trim\(\)\.replace/);
});

test('session creation wizard offers readable instructions and touch-sized steps',()=>{
 assert.match(screen,/stepChip:\{minHeight:44/);
 assert.match(screen,/stepText:\{color:C\.muted,fontSize:13/);
 assert.match(screen,/note:\{color:C\.muted,fontSize:14,lineHeight:21/);
 assert.match(screen,/option:\{gap:12,padding:12,minHeight:44/);
 assert.match(screen,/input:\{borderWidth:1,[^\n]*fontSize:15/);
});
