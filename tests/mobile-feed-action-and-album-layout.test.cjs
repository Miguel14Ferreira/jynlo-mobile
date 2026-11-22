const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('feed keeps like, comment and share buttons visible and separate from counters',()=>{
 const home=read('app/(tabs)/index.tsx');
 const card=home.slice(home.indexOf('function PostCard('),home.indexOf('const Header=',home.indexOf('function PostCard(')));
 assert.match(card,/style=\{styles\.postActions\}/);
 assert.ok(card.indexOf('style={styles.postActions}')<card.indexOf('style={styles.postSummaryAction}'));
 for(const name of ['like','comment','share'])assert.match(card,new RegExp('JynloIcon name="'+name+'"'));
 for(const action of ['Gostar','Abrir comentários','Partilhar publicação'])assert.ok(card.includes('accessibilityLabel="'+action+'"')||card.includes("'"+action+"'"));
 assert.match(card,/toggleLike\(item\)/);
 assert.match(card,/openComments\(item\)/);
 assert.match(card,/sharePost\(item\)/);
 assert.match(card,/item\.hideLikers/);
 assert.match(card,/item\.commentCount/);
 assert.match(card,/comentários/);
 assert.match(card,/pathname:'\/posts\/\[postId\]\/likers'/);
 assert.match(card,/pathname:'\/posts\/\[postId\]'/);
});

test('small devices reduce card padding but keep accessible action targets',()=>{
 const home=read('app/(tabs)/index.tsx');
 assert.match(home,/screenWidth<360&&styles\.postCardCompact/);
 assert.match(home,/postCardCompact:\{paddingHorizontal:10,paddingVertical:13,gap:11\}/);
 assert.match(home,/postPrimaryAction:\{minWidth:40,minHeight:44/);
 assert.match(home,/postSummaryAction:\{minHeight:44/);
 assert.match(home,/accessibilityState=\{\{selected:Boolean\(item\.likedByMe\),disabled:likeBusy\}\}/);
});

test('mixed photo-video albums keep measured paging after a slow drag',()=>{
 const album=read('src/components/PostAlbumCarousel.tsx');
 const photo=read('src/components/AdaptivePostPhoto.tsx');
 assert.match(album,/const updateActive=\(offset:number\)=>/);
 assert.match(album,/Math\.round\(offset\/width\)/);
 assert.match(album,/onMomentumScrollEnd=\{event=>updateActive\(event\.nativeEvent\.contentOffset\.x\)\}/);
 assert.match(album,/onScrollEndDrag=\{event=>updateActive\(event\.nativeEvent\.contentOffset\.x\)\}/);
 assert.match(album,/index===active\?renderVideo\(uri\)/);
 assert.match(album,/height:Math\.max\(190,Math\.round\(width\*\.75\)\)/);
 assert.match(album,/<AdaptivePostPhoto uri=\{uri\} width=\{width\}/);
 assert.match(photo,/resizeMode="contain"/);
 assert.match(photo,/mediaRequestSource\(uri,token\)/);
 assert.match(photo,/Math\.round\(width\*dimensions\.height\/dimensions\.width\)/);
});
