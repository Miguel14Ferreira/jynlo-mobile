'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Feed renders the responsive album without clipping portrait photos',()=>{
 const feed=read('app/(tabs)/index.tsx');
 const album=read('src/components/PostAlbumCarousel.tsx');
 const photo=read('src/components/AdaptivePostPhoto.tsx');
 assert.match(feed,/postMediaItems\(item\)/);
 assert.match(feed,/<PostAlbumCarousel items=\{album\} onExpand=\{setExpandedPostImage\}/);
 assert.match(album,/onLayout=\{event=>/);
 assert.match(album,/horizontal pagingEnabled/);
 assert.match(photo,/resizeMode="contain"/);
 assert.match(photo,/Math\.min\(620,Math\.max\(180/);
});

test('Feed opens the selected photo in a full-screen album and closes it safely',()=>{
 const feed=read('app/(tabs)/index.tsx');
 const viewer=read('src/components/PostImageLightbox.tsx');
 assert.match(feed,/\[expandedPostImage,setExpandedPostImage\]=useState<ExpandedPostPhotos\|null>\(null\)/);
 assert.match(feed,/<PostImageLightbox key=\{/);
 assert.match(feed,/photos=\{identityMatches\?expandedPostImage:null\}/);
 assert.match(feed,/onClose=\{\(\)=>setExpandedPostImage\(null\)\}/);
 assert.match(viewer,/presentationStyle="fullScreen"/);
 assert.match(viewer,/resizeMode="contain"/);
 assert.match(viewer,/onRequestClose=\{onClose\}/);
 assert.match(viewer,/Fotografia seguinte/);
});

test('Feed item keys remain stable when new posts arrive',()=>{
 const feed=read('app/(tabs)/index.tsx');
 assert.match(feed,/keyExtractor=\{\(item,index\)=>feedEntryKey\(item\)/);
 assert.doesNotMatch(feed,/item\.postId\|\|item\.sessionId\|\|index\}\/);
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
 assert.match(s,/storyComposerWasOpen&&storyComposerRef\.current&&storyComposerRevision\.current===storyRevision&&prepared\[0\]/);
 assert.match(s,/storyComposerRevision\.current\+\+;storyComposerRef\.current=false/);
 assert.match(s,/setStoryCaption\(''\);storyCaptionRef\.current=''/);
});

test('camera and gallery drafts cannot cross a closed and reopened editor',()=>{
 const s=read('app/(tabs)/index.tsx');
 assert.match(s,/const postComposerRevision=useRef\(0\)/);
 assert.match(s,/const storyComposerRevision=useRef\(0\)/);
 assert.match(s,/postComposerRevision\.current!==postRevision/);
 assert.match(s,/storyComposerRevision\.current===storyRevision/);
 assert.match(s,/key=\{storyComposerRevision\.current\} onCaptured/);
 assert.match(s,/storyComposerRef\.current&&storyComposerRevision\.current===storyCaptureRevision&&!storyInFlight\.current/);
});
test('story editor warns before discarding a video photo or caption',()=>{
 const s=read('app/(tabs)/index.tsx');
 assert.match(s,/function closeStoryComposer\(/);
 assert.match(s,/Descartar Story\?/);
 assert.match(s,/onRequestClose=\{closeStoryComposer\}/);
 assert.match(s,/onPress=\{closeStoryComposer\}/);
});
