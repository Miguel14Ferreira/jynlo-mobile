'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {albumError,mergeAlbum,postMediaItems,MAX_ALBUM_ITEMS}=require('../src/lib/post-album.cjs');
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
