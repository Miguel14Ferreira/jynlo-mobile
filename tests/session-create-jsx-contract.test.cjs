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
