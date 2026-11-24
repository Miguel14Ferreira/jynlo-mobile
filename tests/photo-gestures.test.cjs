'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const g=require('../src/lib/photo-gestures.cjs');
test('double tap and pinch follow Instagram',()=>{
 assert.equal(g.isDoubleTap(1000,1200,10,10,12,14),true);
 assert.equal(g.isDoubleTap(1000,1400,10,10,12,14),false);
 assert.equal(g.isDoubleTap(1000,1100,10,10,200,14),false);
 assert.equal(g.pinchScale(100,250),2.5);
 assert.equal(g.pinchScale(100,50),1);
 assert.equal(g.pinchScale(100,900),4);
 const photo=fs.readFileSync(path.join(__dirname,'../src/components/AdaptivePostPhoto.tsx'),'utf8');
 assert.match(photo,/onDoubleTap/);
 const feed=fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8');
 assert.match(feed,/onDoubleTap=\{.*if\(!item\.likedByMe\)void toggleLike\(item\);/);
});
