const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {albumError,mergeAlbum,appendAlbumSelection,moveAlbumItem,postMediaItems,MAX_ALBUM_ITEMS}=require('../src/lib/post-album.cjs');
const photo=(uri,size=1000)=>({uri,type:'image',mimeType:'image/jpeg',fileName:'photo.jpg',fileSize:size});
const video=(uri,size=2000)=>({uri,type:'video',mimeType:'video/mp4',fileName:'clip.mp4',fileSize:size});
test('accept one to six mixed media and preserves order',()=>{
 const files=[photo('a'),video('b'),photo('c'),photo('d'),photo('e'),video('f')];
 assert.equal(albumError(files),null);
 assert.equal(MAX_ALBUM_ITEMS,6);
 assert.deepEqual(mergeAlbum([files[0]],files.slice(1)),files);
});
test('reject duplicate, excessive, unsupported and oversized media',()=>{
 assert.match(albumError([]),/1 e 6/);
 assert.match(albumError(Array.from({length:7},(_,i)=>photo(String(i)))),/1 e 6/);
 assert.match(albumError([photo('huge',6*1024*1024)]),/5 MB/);
 assert.match(albumError([video('huge',21*1024*1024)]),/20 MB/);
 assert.match(albumError([photo('a',0)]),/tamanho/);
 assert.equal(albumError([photo('a',0)],true),null);
 assert.match(albumError([photo('x',1000),{...photo('y'),mimeType:'image/heic'}]),/Formato/);
 assert.equal(mergeAlbum([photo('a')],[photo('a'),photo('b')]).length,2);
});
test('render album from server first asset followed by extraMedia',()=>{
 assert.deepEqual(postMediaItems({imageUrl:'/img/1',videoUrl:null,extraMedia:[
  {url:'/vid/2',mimeType:'video/mp4'},{url:'/img/3',mimeType:'image/png'}]}),[
  {url:'/img/1',type:'image'},{url:'/vid/2',type:'video'},{url:'/img/3',type:'image'}]);
 assert.deepEqual(postMediaItems({imageUrl:null,videoUrl:'/first',extraMedia:[]}),[{url:'/first',type:'video'}]);
});

test('MIME must agree with selected photo or video type before real backend upload',()=>{
 assert.match(albumError([{...photo('clip'),type:'image',mimeType:'video/mp4'}]),/formato/i);
 assert.match(albumError([{...video('photo'),type:'video',mimeType:'image/jpeg'}]),/formato/i);
 assert.match(albumError([{...photo('x'),mimeType:'image/heic'}]),/formato/i);
 assert.equal(albumError([video('valid'),photo('valid2')]),null);
});
test('archived or malformed server albums never crash Feed, profiles or post details',()=>{
 assert.deepEqual(postMediaItems(null),[]);
 assert.deepEqual(postMediaItems({imageUrl:'/cover',extraMedia:{bad:'shape'}}),[{url:'/cover',type:'image'}]);
 assert.deepEqual(postMediaItems({imageUrl:'/cover',extraMedia:[null,{url:'/wrong',mimeType:'image/svg+xml'},
   {url:'/cover',mimeType:'image/png'},{url:'/movie',mimeType:'video/mp4'}]}),[
   {url:'/cover',type:'image'},{url:'/movie',type:'video'}
 ]);
 assert.deepEqual(postMediaItems({imageUrl:3,videoUrl:'/video',extraMedia:[{url:'/image',mimeType:'image/webp'}]}),[
   {url:'/video',type:'video'},{url:'/image',type:'image'}
 ]);
 assert.equal(postMediaItems({imageUrl:'/one',extraMedia:Array.from({length:50},(_,i)=>({
   url:'/'+i,mimeType:'image/jpeg'}))}).length,6);
});

test('gallery selection appends up to six without discarding previous files',()=>{
 const current=[photo('one'),photo('two')];
 const added=appendAlbumSelection(current,[video('three'),photo('four')]);
 assert.equal(added.error,null);
 assert.deepEqual(added.items.map(f=>f.uri),['one','two','three','four']);
 assert.deepEqual(current.map(f=>f.uri),['one','two']);
 const over=appendAlbumSelection(added.items,[photo('five'),photo('six'),photo('seven')]);
 assert.match(over.error,/até 6/);
 assert.deepEqual(over.items.map(f=>f.uri),['one','two','three','four']);
});
test('reordering only moves the selected file and leaves original media untouched',()=>{
 const original=[photo('first'),video('second'),photo('third')];
 assert.deepEqual(moveAlbumItem(original,2,0).map(x=>x.uri),['third','first','second']);
 assert.deepEqual(moveAlbumItem(original,0,2).map(x=>x.uri),['second','third','first']);
 assert.deepEqual(original.map(x=>x.uri),['first','second','third']);
 assert.deepEqual(moveAlbumItem(original,-1,1),original);
});
test('TypeScript declaration exposes the album functions used by the mobile composer',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const declaration=untranslate(fs.readFileSync(path.join(__dirname,'../src/lib/post-album.d.cts'),'utf8'));
 assert.match(declaration,/export declare function appendAlbumSelection\(/);
 assert.match(declaration,/export declare function moveAlbumItem\(/);
 assert.match(declaration,/items:MobileMedia\[\];error:string\|null/);
});
