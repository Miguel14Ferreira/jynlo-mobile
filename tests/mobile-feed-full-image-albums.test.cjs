'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Feed displays every photo without cropping and keeps album width inside padded cards',()=>{
 const s=read('app/(tabs)/index.tsx');
 assert.match(s,/Math.max\(220,screenWidth-56\)/);
 assert.match(s,/style=\{styles.postImage\} resizeMode="contain"/);
 assert.match(s,/postImage:\{width:'100%',height:350,borderRadius:12,backgroundColor:/);
 assert.match(s,/pointerEvents="none" style=\{styles.albumCounter\}/);
 assert.match(s,/album.length>1/);
 assert.match(s,/postMediaItems\(item\)/);
});
test('Feed image can be opened fullscreen and dismissed without leaving chat or feed',()=>{
 const s=read('app/(tabs)/index.tsx');
 assert.match(s,/\[expandedPostImage,setExpandedPostImage\]=useState<string\|null>\(null\)/);
 assert.match(s,/accessibilityLabel=\{'Ampliar fotografia '\+\(i\+1\)/);
 assert.match(s,/onPress=\{\(\)=>setExpandedPostImage\(uri\)\}/);
 assert.match(s,/visible=\{identityMatches&&!!expandedPostImage\}/);
 assert.match(s,/onRequestClose=\{\(\)=>setExpandedPostImage\(null\)\}/);
 assert.match(s,/accessibilityLabel="Fechar fotografia ampliada"/);
 assert.match(s,/postPhotoFull:\{width:'100%',height:'86%'\}/);
 assert.match(s,/setExpandedPostImage\(null\);/);
});
test('photo composer preview uses contain rather than hiding edges of images',()=>{
 const s=read('app/(tabs)/index.tsx');
 assert.match(s,/media.type==='image'\?<Image source=\{\{uri:media.uri\}\} resizeMode="contain" style=\{styles.postMediaPreviewImage\}/);
 assert.match(s,/postMediaPreviewImage:\{width:'100%',height:300,backgroundColor:/);
});
