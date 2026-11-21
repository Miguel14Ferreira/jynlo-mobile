'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {mediaUriExtension,isUnsupportedMediaContainer,pickerMediaMime}=require('../src/lib/picker-media-format.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('native media URI extensions are read without confusing search strings or fragments',()=>{
 assert.equal(mediaUriExtension('file:///cache/photo.JPG?width=1'),'jpg');
 assert.equal(mediaUriExtension('content://provider/item.mp4#frag'),'mp4');
 assert.equal(mediaUriExtension('content://provider/opaque/123'),null);
 assert.equal(mediaUriExtension(null),null);
});

test('iPhone MOV and HEIC containers never pass as MP4 or JPEG even if picker metadata lies',()=>{
 for(const ext of ['mov','MOV','heic','heif','avi','mkv','m4v']){
  const asset={uri:'file:///cache/capture.'+ext,type:ext.toLowerCase()==='heic'?'image':'video',
    mimeType:ext.toLowerCase()==='heic'?'image/jpeg':'video/mp4'};
  assert.equal(isUnsupportedMediaContainer(asset.uri),true);
  assert.equal(pickerMediaMime(asset),null);
 }
 assert.equal(pickerMediaMime({uri:'file:///cache/movie.MOV?from=picker',type:'video',mimeType:'video/mp4'}),null);
});

test('supported photo and video assets preserve correct MIME without inventing formats',()=>{
 const samples=[
  ['photo.jpg','image','image/jpeg'],['photo.png','image','image/png'],
  ['photo.webp','image','image/webp'],['clip.mp4','video','video/mp4'],
  ['clip.webm','video','video/webm']
 ];
 for(const [name,type,mime] of samples){
  assert.equal(pickerMediaMime({uri:'file:///cache/'+name,type,mimeType:mime}),mime);
  assert.equal(pickerMediaMime({uri:'file:///cache/'+name,type,mimeType:null}),mime);
 }
 assert.equal(pickerMediaMime({uri:'file:///cache/abc',type:'video',mimeType:null}),null);
 assert.equal(pickerMediaMime({uri:'file:///cache/video.mp4',type:'image',mimeType:null}),null);
 // Generic MIME from Android is accepted only when the actual extension is supported.
 assert.equal(pickerMediaMime({uri:'file:///cache/picture.jpg',type:'image',mimeType:'application/octet-stream'}),'image/jpeg');
 assert.equal(pickerMediaMime({uri:'file:///cache/opaque',type:'image',mimeType:'application/octet-stream'}),null);
});

test('Story camera and picker share safe MIME checks, and post videos are uncropped',()=>{
 const feed=read('app/(tabs)/index.tsx');
 const camera=read('src/components/StoryCameraCapture.tsx');
 const player=read('src/components/FeedVideo.tsx');
 assert.match(feed,/const mime=pickerMediaMime\(asset\)/);
 assert.match(feed,/Os formatos MOV e HEIC ainda não são aceites/);
 // The native camera uses the same MIME whitelist as the picker: MOV/HEIC are rejected there.
 assert.match(camera,/const mime=pickerMediaMime\(asset\)/);
 assert.match(camera,/if\(!mime\)\{setError\('Formato não suportado/);
 assert.match(player,/contentFit=("contain"|\{story\?'cover':'contain'\})/);
 assert.match(player,/nativeControls=\{!story\}/);
});
