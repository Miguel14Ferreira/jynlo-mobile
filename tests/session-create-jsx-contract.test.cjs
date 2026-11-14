'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const screen=fs.readFileSync(path.join(__dirname,'..','app','sessions','create.tsx'),'utf8');

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
