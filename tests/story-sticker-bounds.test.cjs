'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {stickerBounds,clampStickerPosition,storyMetadataReservedHeight}=require('../src/lib/story-sticker-bounds.cjs');

test('sticker stays inside a narrow mobile Story preview',()=>{
 const area={width:280,height:320},sticker={width:180,height:60};
 const limits=stickerBounds(area,sticker,1);
 assert.ok(limits.minX>20&&limits.maxX<80);
 assert.ok(limits.minY>8&&limits.maxY<92);
 const topLeft=clampStickerPosition({x:0,y:0,rotation:0,zoom:1},area,sticker);
 assert.equal(topLeft.x,limits.minX);
 assert.equal(topLeft.y,limits.minY);
 const bottomRight=clampStickerPosition({x:100,y:100,rotation:0,zoom:1},area,sticker);
 assert.equal(bottomRight.x,limits.maxX);
 assert.equal(bottomRight.y,limits.maxY);
});
test('zoom increases safe margins without changing rotation or zoom',()=>{
 const area={width:320,height:360},sticker={width:150,height:50};
 const base=stickerBounds(area,sticker,1,30),zoomed=stickerBounds(area,sticker,2,30);
 assert.ok(zoomed.minX>base.minX);
 assert.ok(zoomed.minY>base.minY);
 const result=clampStickerPosition({x:100,y:0,rotation:30,zoom:2},area,sticker);
 assert.equal(result.rotation,30);
 assert.equal(result.zoom,2);
 assert.equal(result.x,zoomed.maxX);
 assert.equal(result.y,zoomed.minY);
});
test('rotation grows the safe edge margin when long captions turn sideways',()=>{
 const area={width:320,height:400},sticker={width:220,height:40};
 const normal=stickerBounds(area,sticker,1,0);
 const rotated=stickerBounds(area,sticker,1,90);
 assert.ok(rotated.minY>normal.minY);
 assert.ok(rotated.minX<normal.minX);
 const moved=clampStickerPosition({x:50,y:100,rotation:90,zoom:1},area,sticker);
 assert.equal(moved.y,rotated.maxY);
});
test('extremely large sticker remains centered when it cannot fit',()=>{
 const result=clampStickerPosition({x:2,y:99,rotation:0,zoom:3},{width:200,height:220},{width:300,height:160});
 assert.equal(result.x,50);
 assert.equal(result.y,50);
});
test('Story composer uses responsive preview and compact layout on short screens',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const screen=fs.readFileSync(path.join(__dirname,'..','app','(tabs)','index.tsx'),'utf8');
 const placement=fs.readFileSync(path.join(__dirname,'..','src','components','StoryTextPlacement.tsx'),'utf8');
 assert.match(screen,/screenHeight\*0\.48/);
 assert.match(screen,/screenHeight<700&&styles\.storyComposerCompact/);
 assert.match(placement,/clampStickerPosition\(next,area,sticker,reservedTopPx\)/);
 assert.match(placement,/clampStickerPosition\(geometry,area,sticker,reservedTopPx\)/);
});

test('Story metadata badges reserve space so caption does not overlap them',()=>{
 assert.equal(storyMetadataReservedHeight('',''),0);
 assert.ok(storyMetadataReservedHeight('Lisboa','')>0);
 assert.ok(storyMetadataReservedHeight('','ana,joao')>0);
 assert.ok(storyMetadataReservedHeight('Lisboa','ana,joao')>storyMetadataReservedHeight('Lisboa',''));
 const area={width:320,height:400},caption={width:160,height:55};
 const without=stickerBounds(area,caption,1,0,0);
 const withDetails=stickerBounds(area,caption,1,0,112);
 assert.ok(withDetails.minY>without.minY);
 const pos=clampStickerPosition({x:50,y:0,rotation:0,zoom:1},area,caption,112);
 assert.ok(pos.y>=withDetails.minY);
});
test('published Stories and the editor both reserve the same metadata zone',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const screen=fs.readFileSync(path.join(__dirname,'..','app','(tabs)','index.tsx'),'utf8');
 const details=fs.readFileSync(path.join(__dirname,'..','src','components','StoryDetailsView.tsx'),'utf8');
 assert.match(screen,/storyMetadataReservedHeight\(story\.locationLabel,story\.taggedUsernames\)/);
 assert.match(screen,/storyMetadataReservedHeight\(storyLocation,storyTags\)/);
 assert.match(details,/<ScrollView horizontal showsHorizontalScrollIndicator=\{false\}/);
 assert.match(details,/contentContainerStyle=\{styles\.tags\}/);
 assert.match(details,/onPress=\{\(\)=>onOpenProfile\(username\)\}/);
});
