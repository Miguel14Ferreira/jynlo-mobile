'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('feed carousels measure their own cards rather than assuming device width',()=>{
 const carousel=read('src/components/PostAlbumCarousel.tsx');
 const feed=read('app/(tabs)/index.tsx');
 assert.match(carousel,/onLayout=\{event=>\{/);
 assert.match(carousel,/layout\.width/);
 assert.match(carousel,/<ScrollView key=\{width\} horizontal pagingEnabled/);
 assert.match(carousel,/style=\{\{width\}\}/);
 assert.match(carousel,/contentOffset\.x\/width/);
 assert.match(carousel,/Math\.min\(items\.length-1,Math\.max\(0,index\)\)/);
 assert.match(feed,/<PostAlbumCarousel items=\{album\}/);
 assert.doesNotMatch(feed,/width:\s*Math\.max\(220,screenWidth-56\)/);
});
test('mixed image/video posts retain contained images, video controls and expanded photos',()=>{
 const carousel=read('src/components/PostAlbumCarousel.tsx');
 const image=read('src/components/AdaptivePostPhoto.tsx');
 const video=read('src/components/FeedVideo.tsx');
 assert.match(carousel,/entry\.type==='video'\?renderVideo\(uri\)/);
 assert.match(carousel,/<AdaptivePostPhoto uri=\{uri\} width=\{width\}/);
 assert.match(carousel,/onExpand=\{\(\)=>onExpand\(uri\)\}/);
 assert.match(image,/resizeMode="contain"/);
 assert.match(video,/contentFit=\{story\?'cover':'contain'\}/);
 assert.match(video,/nativeControls=\{!story\}/);
});
test('multi-media posts show accessible current position and pagination dots',()=>{
 const s=read('src/components/PostAlbumCarousel.tsx');
 assert.match(s,/items\.length>1\?<View style=\{styles\.pagination\}>/);
 assert.match(s,/Ficheiro '\+\(active\+1\)\+' de '/);
 assert.match(s,/accessibilityLabel=\{'Álbum com '\+items\.length\+' ficheiros'\}/);
 assert.match(s,/showsHorizontalScrollIndicator=\{false\}/);
});

test('album editor adapts preview width and allows long filenames to wrap without hiding controls',()=>{
 const feed=read('app/(tabs)/index.tsx');
 assert.match(feed,/width:Math\.min\(260,Math\.max\(165,screenWidth-72\)\)/);
 assert.match(feed,/numberOfLines=\{2\}>\{i===0\?'Capa/);
 assert.match(feed,/postMediaPreviewFooter:\{gap:8/);
 assert.match(feed,/accessibilityLabel=\{\x60Mover ficheiro \$\{i\+1\} para trás\x60\}/);
 assert.match(feed,/accessibilityLabel=\{\x60Remover ficheiro \$\{i\+1\}\x60\}/);
});
