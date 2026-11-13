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

test('album ordering changes only the selected item and keeps files intact',()=>{
 const {moveAlbumItem}=require('../src/lib/post-album.cjs');
 const files=[{uri:'a'},{uri:'b'},{uri:'c'}];
 assert.deepEqual(moveAlbumItem(files,2,0).map(x=>x.uri),['c','a','b']);
 assert.deepEqual(moveAlbumItem(files,0,2).map(x=>x.uri),['b','c','a']);
 assert.deepEqual(moveAlbumItem(files,-1,0),files);
 assert.deepEqual(moveAlbumItem(files,0,99),files);
 assert.deepEqual(files.map(x=>x.uri),['a','b','c']);
});
test('post editor exposes reorder controls, preserving chosen cover for upload',()=>{
 const s=read('app/(tabs)/index.tsx');
 assert.match(s,/moveAlbumItem\(prev,prev.findIndex/);
 assert.match(s,/Mover ficheiro .* para trás/);
 assert.match(s,/Mover ficheiro .* para a frente/);
 assert.match(s,/changeComposerMedia\(prev=>prev.filter/);
});

test('native album selection merges and validates the full draft atomically',()=>{
 const {appendAlbumSelection}=require('../src/lib/post-album.cjs');
 const make=i=>({uri:'file://'+i+'.jpg',type:'image',mimeType:'image/jpeg',fileSize:1200});
 const current=[make(1),make(2)];
 const good=appendAlbumSelection(current,[make(2),make(3)]);
 assert.equal(good.error,null);
 assert.deepEqual(good.items.map(x=>x.uri),['file://1.jpg','file://2.jpg','file://3.jpg']);
 assert.equal(current.length,2);
 const excess=appendAlbumSelection(current,[make(3),make(4),make(5),make(6),make(7)]);
 assert.match(excess.error,/até 6/);
 assert.deepEqual(excess.items,current);
 const invalid=appendAlbumSelection(current,[{...make(4),mimeType:'video/mp4'}]);
 assert.match(invalid.error,/Formato/);assert.deepEqual(invalid.items,current);
});
test('composer protects unsent posts and native picker does not restore abandoned drafts',()=>{
 const s=read('app/(tabs)/index.tsx');
 assert.match(s,/function closePostComposer\(/);
 assert.match(s,/Descartar publicação\?/);
 assert.match(s,/onRequestClose=\{closePostComposer\}/);
 assert.match(s,/Remover todos os ficheiros da publicação/);
 assert.match(s,/!postComposerWasOpen\|\|!composerOpenRef\.current/);
 assert.match(s,/appendAlbumSelection\(composerMediaRef\.current,prepared\)/);
});

test('native picker caps selection to free album capacity and rejects late Story results',()=>{
 const s=read('app/(tabs)/index.tsx');
 assert.match(s,/MAX_ALBUM_ITEMS-composerMediaRef\.current\.length/);
 assert.match(s,/selectionLimit:availableAlbumSlots/);
 assert.match(s,/if\(album&&availableAlbumSlots===0\)/);
 assert.match(s,/storyComposerWasOpen&&storyComposerRef\.current&&prepared\[0\]/);
 assert.match(s,/storyComposerRef\.current=false;setStoryCaption\(''\)/);
});
