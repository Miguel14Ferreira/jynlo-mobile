'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {confirmedSocialMediaReceipt}=require('../src/lib/social-upload-receipt.cjs');
const {postMediaItems}=require('../src/lib/post-album.cjs');

const types=['image/jpeg','video/mp4','image/png'];
const original={
 postId:91,imageUrl:'/api/profile-media/posts/91/image',
 extraMedia:[
  {url:'/api/profile-media/posts/91/extra-0',mimeType:'video/mp4'},
  {url:'/api/profile-media/posts/91/extra-1',mimeType:'image/png'}
 ]
};
test('the server must confirm every unique persisted media reference before post success',()=>{
 assert.equal(confirmedSocialMediaReceipt(original,types,false),true);
 assert.equal(postMediaItems(original).length,3);
 const repeatedFirst={...original,extraMedia:[{url:original.imageUrl,mimeType:'video/mp4'},original.extraMedia[1]]};
 assert.equal(confirmedSocialMediaReceipt(repeatedFirst,types,false),false);
 assert.equal(postMediaItems(repeatedFirst).length,2);
 const repeatedExtra={...original,extraMedia:[original.extraMedia[0],{url:original.extraMedia[0].url,mimeType:'image/png'}]};
 assert.equal(confirmedSocialMediaReceipt(repeatedExtra,types,false),false);
 assert.equal(postMediaItems(repeatedExtra).length,2);
});

test('media confirmation rejects missing, misordered or incorrectly typed album items',()=>{
 assert.equal(confirmedSocialMediaReceipt({...original,extraMedia:[original.extraMedia[0]]},types,false),false);
 assert.equal(confirmedSocialMediaReceipt({...original,extraMedia:[original.extraMedia[1],original.extraMedia[0]]},types,false),false);
 assert.equal(confirmedSocialMediaReceipt({...original,extraMedia:[{url:' ',mimeType:'video/mp4'},original.extraMedia[1]]},types,false),false);
 assert.equal(confirmedSocialMediaReceipt({...original,imageUrl:null},types,false),false);
});

test('a single image, a single video and a Story still follow the existing receipt contract',()=>{
 assert.equal(confirmedSocialMediaReceipt({postId:1,imageUrl:'/photo'},['image/jpeg'],false),true);
 assert.equal(confirmedSocialMediaReceipt({postId:2,videoUrl:'/video'},['video/mp4'],false),true);
 assert.equal(confirmedSocialMediaReceipt({id:3,mediaUrl:'/story',video:false},['image/jpeg'],true),true);
 assert.equal(confirmedSocialMediaReceipt({id:4,mediaUrl:'/story',video:true},['video/mp4'],true),true);
});

test('receipt media references reject schemes, redirect-like URLs and traversal',()=>{
 const unsafe=[
  'javascript:alert(1)','data:image/png;base64,aGVsbG8=',
  'http://unsecured.example.com/asset','//outside.example.com/file.png',
  'https://user@outside.example.com/file.png',
  'media/../private/other-account',
  '/api/media/../private/other-account',
  '/api/media/\\\\secret','/api/media/\nredirect',
  'https://example.org/\ninvalid'
 ];
 for(const media of unsafe){
  assert.equal(confirmedSocialMediaReceipt({postId:1,imageUrl:media},['image/jpeg'],false),false,media);
  assert.equal(confirmedSocialMediaReceipt({id:1,mediaUrl:media,video:false},['image/jpeg'],true),false,media);
 }
});
test('receipt media URLs accept protected API paths and normal HTTPS storage',()=>{
 for(const media of [
  '/api/profile-media/posts/42/image',
  'https://static.jynlo.example/assets/post-42.webp?signature=abcd',
  'media/post-42.jpg'
  ,'media/post-43.jpg?size=small'
 ]){
  assert.equal(confirmedSocialMediaReceipt({postId:42,imageUrl:media},['image/jpeg'],false),true,media);
 }
});
test('Story success requires an explicit boolean media kind',()=>{
 const base={id:3,mediaUrl:'/api/profile-media/stories/3'};
 for(const video of [undefined,null,0,1,'false','true'])
  assert.equal(confirmedSocialMediaReceipt({...base,video},['image/jpeg'],true),false);
 assert.equal(confirmedSocialMediaReceipt({...base,video:false},['image/jpeg'],true),true);
 assert.equal(confirmedSocialMediaReceipt({...base,video:true},['video/mp4'],true),true);
});
