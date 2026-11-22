const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('feed carousels measure their own cards rather than assuming device width',()=>{
 const carousel=read('src/components/PostAlbumCarousel.tsx');
 const feed=read('app/(tabs)/index.tsx');
 assert.match(carousel,/onLayout=\{event=>\{/);
 assert.match(carousel,/layout\.width/);
 assert.match(carousel,/<ScrollView key=\{width\+'-'\+albumIdentity\} horizontal pagingEnabled/);
 assert.match(carousel,/style=\{\{width\}\}/);
 assert.match(carousel,/Math\.round\(offset\/width\)/);
 assert.match(carousel,/Math\.min\(items\.length-1,Math\.max\(0,next\)\)/);
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
 assert.match(video,/contentFit=("contain"|\{story\?'cover':'contain'\})/);
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
 assert.match(feed,/width:composerMedia\.length===1\?Math\.max\(200,screenWidth-68\):Math\.max\(200,screenWidth-92\)/);
 assert.match(feed,/i===0\?' · Capa':''/);
 assert.match(feed,/postMediaPreviewFooter:\{gap:8/);
 assert.match(feed,/accessibilityLabel=\{\x60Mover ficheiro \$\{i\+1\} para trás\x60\}/);
 assert.match(feed,/accessibilityLabel=\{\x60Remover ficheiro \$\{i\+1\}\x60\}/);
});

test('fullscreen gallery keeps images uncropped with visible close and album controls',()=>{
 const lightbox=read('src/components/PostImageLightbox.tsx');
 const feed=read('app/(tabs)/index.tsx');
 assert.match(lightbox,/presentationStyle="fullScreen"/);
 assert.match(lightbox,/resizeMode="contain"/);
 assert.match(lightbox,/<CloseIconButton onPress=\{onClose\} label="Fechar fotografia ampliada"/);
 assert.match(lightbox,/accessibilityLabel="Fotografia anterior"/);
 assert.match(lightbox,/accessibilityLabel="Fotografia seguinte"/);
 assert.match(feed,/<PostImageLightbox key=\{expandedPostImage\?\.uris\[expandedPostImage\.index\]/);
 assert.match(feed,/photos=\{identityMatches\?expandedPostImage:null\}/);
 assert.doesNotMatch(feed,/<Modal visible=\{identityMatches&&!!expandedPostImage\}/);
});
test('inactive videos do not mount a second player behind the carousel',()=>{
 const s=read('src/components/PostAlbumCarousel.tsx');
 assert.match(s,/index===active\?renderVideo\(uri\)/);
 assert.match(s,/height:Math\.max\(190,Math\.round\(width\*\.75\)\)/);
 assert.match(s,/onMomentumScrollEnd=\{event=>/);
 assert.match(s,/onScrollEndDrag=\{event=>updateActive\(event\.nativeEvent\.contentOffset\.x\)\}/);
});

test('full-screen photos support swipe gestures, page buttons and rotation',()=>{
 const viewer=read('src/components/PostImageLightbox.tsx');
 assert.match(viewer,/<ScrollView ref=\{scroll\} key=\{viewport.width\+'x'\+viewport.height\} style=\{\{flex:1\}\} horizontal pagingEnabled/);
 assert.match(viewer,/onMomentumScrollEnd=\{event=>/);
 assert.match(viewer,/contentOffset=\{\{x:index\*viewport.width,y:0\}\}/);
 assert.match(viewer,/scroll\.current\?\.scrollTo\(\{x:selected\*viewport.width,animated:true\}\)/);
 assert.match(viewer,/resizeMode="contain"/);
 assert.match(viewer,/onPress=\{\(\)=>moveTo\(index-1\)\}/);
 assert.match(viewer,/onPress=\{\(\)=>moveTo\(index\+1\)\}/);
});

test('Story video sound has a visible toggle and remains independent of feed videos',()=>{
 const screen=read('app/(tabs)/index.tsx');
 const video=read('src/components/FeedVideo.tsx');
 const icons=read('src/components/JynloIcon.tsx');
 assert.match(screen,/storyMuted,setStoryMuted/);
 assert.match(screen,/setStoryMuted\(true\)/);
 assert.match(screen,/story muted=\{storyMuted\}/);
 assert.match(screen,/accessibilityLabel=\{storyMuted\?'Ativar som do vídeo':'Silenciar vídeo'\}/);
 assert.match(screen,/name=\{storyMuted\?'volume-off':'volume'\}/);
 assert.match(video,/muted=false,onEnd/);
 assert.match(video,/if\(story\)player\.muted=muted/);
 assert.match(icons,/'volume-off':\{regular:'volume-mute-outline'/);
});

test('lightbox explicitly measures width and height so media cannot collapse in a horizontal scroller',()=>{
 const viewer=read('src/components/PostImageLightbox.tsx');
 assert.match(viewer,/setViewport\(\{width,height\}\)/);
 assert.match(viewer,/viewport\.width>0&&viewport\.height>0/);
 assert.match(viewer,/style=\{\{width:viewport\.width,height:viewport\.height\}\}/);
 assert.match(viewer,/style=\{\{width:viewport\.width,height:viewport\.height\}\}>/);
});
