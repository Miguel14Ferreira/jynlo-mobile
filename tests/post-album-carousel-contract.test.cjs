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
 assert.match(carousel,/entry\.type==='video'\?\(index===active\?renderVideo\(uri\)/);
 assert.match(carousel,/styles\.videoInactive/);
 assert.match(carousel,/<AdaptivePostPhoto uri=\{uri\} width=\{width\}/);
 assert.match(carousel,/onExpand=\{\(\)=>\{const images=items\.filter/);
 assert.match(carousel,/onExpand\(\{uris:images,index:images\.indexOf\(uri\)\}\)/);
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

test('fullscreen gallery keeps images uncropped with visible close and album controls',()=>{
 const lightbox=read('src/components/PostImageLightbox.tsx');
 const feed=read('app/(tabs)/index.tsx');
 assert.match(lightbox,/presentationStyle="fullScreen"/);
 assert.match(lightbox,/resizeMode="contain"/);
 assert.match(lightbox,/accessibilityLabel="Fechar fotografia ampliada"/);
 assert.match(lightbox,/accessibilityLabel="Fotografia anterior"/);
 assert.match(lightbox,/accessibilityLabel="Fotografia seguinte"/);
 assert.match(feed,/<PostImageLightbox key=\{expandedPostImage\?\.uris\[expandedPostImage\.index\]/);
 assert.match(feed,/photos=\{identityMatches\?expandedPostImage:null\}/);
 assert.doesNotMatch(feed,/<Modal visible=\{identityMatches&&!!expandedPostImage\}/);
});
test('inactive videos do not mount a second player behind the carousel',()=>{
 const s=read('src/components/PostAlbumCarousel.tsx');
 assert.match(s,/index===active\?renderVideo\(uri\)/);
 assert.match(s,/videoInactive:\{height:300/);
 assert.match(s,/onMomentumScrollEnd=\{event=>/);
});

test('full-screen photos support swipe gestures, page buttons and rotation',()=>{
 const viewer=read('src/components/PostImageLightbox.tsx');
 assert.match(viewer,/<ScrollView ref=\{scroll\} key=\{pageWidth\} style=\{\{flex:1\}\} horizontal pagingEnabled/);
 assert.match(viewer,/onMomentumScrollEnd=\{event=>/);
 assert.match(viewer,/contentOffset=\{\{x:index\*pageWidth,y:0\}\}/);
 assert.match(viewer,/scroll\.current\?\.scrollTo\(\{x:selected\*pageWidth,animated:true\}\)/);
 assert.match(viewer,/resizeMode="contain"/);
 assert.match(viewer,/onPress=\{\(\)=>moveTo\(index-1\)\}/);
 assert.match(viewer,/onPress=\{\(\)=>moveTo\(index\+1\)\}/);
});
