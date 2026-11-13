'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {confirmedSocialMediaReceipt}=require('../src/lib/social-upload-receipt.cjs');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const one={postId:15,imageUrl:'/media/p.jpg',videoUrl:null,extraMedia:[]};
const album={postId:19,imageUrl:'/media/cover.jpg',extraMedia:[
 {url:'/media/second.mp4',mimeType:'video/mp4'},
 {url:'/media/third.png',mimeType:'image/png'}
]};
test('real post receipt must confirm media content for single photo, video and full album',()=>{
 assert.equal(confirmedSocialMediaReceipt(one,['image/jpeg'],false),true);
 assert.equal(confirmedSocialMediaReceipt({...one,imageUrl:null},['image/jpeg'],false),false);
 assert.equal(confirmedSocialMediaReceipt({...one,videoUrl:'/v.mp4'},['video/mp4'],false),true);
 assert.equal(confirmedSocialMediaReceipt(album,['image/jpeg','video/mp4','image/png'],false),true);
 assert.equal(confirmedSocialMediaReceipt({...album,extraMedia:album.extraMedia.slice(0,1)},['image/jpeg','video/mp4','image/png'],false),false);
 assert.equal(confirmedSocialMediaReceipt({...album,extraMedia:[album.extraMedia[1],album.extraMedia[0]]},['image/jpeg','video/mp4','image/png'],false),false);
 assert.equal(confirmedSocialMediaReceipt({...album,postId:'19'},['image/jpeg','video/mp4','image/png'],false),false);
});
test('real Story receipt requires expected media and type, not just an HTTP 2xx or ID',()=>{
 const photo={id:20,mediaUrl:'/media/story.jpg',video:false};
 const video={id:21,mediaUrl:'/media/story.mp4',video:true};
 assert.equal(confirmedSocialMediaReceipt(photo,['image/jpeg'],true),true);
 assert.equal(confirmedSocialMediaReceipt(video,['video/mp4'],true),true);
 assert.equal(confirmedSocialMediaReceipt({...photo,mediaUrl:''},['image/jpeg'],true),false);
 assert.equal(confirmedSocialMediaReceipt(photo,['video/mp4'],true),false);
 assert.equal(confirmedSocialMediaReceipt(video,['image/jpeg'],true),false);
 assert.equal(confirmedSocialMediaReceipt({...photo,id:0},['image/jpeg'],true),false);
});
test('feed uses authenticated API, native measured sizes and checked server receipts',()=>{
 const api=read('src/lib/social-feed-api.ts');
 assert.match(api,/if\(!DEMO_MODE\)\{\s*if\(!token\|\|!username\)throw Error/);
 assert.match(api,/return request<FeedItem\[\]>\('\/api\/feed',\{token\}\)/);
 assert.match(api,/const actualSize=localFile.exists\?localFile.size:-1/);
 assert.match(api,/!Number.isSafeInteger\(actualSize\)\|\|actualSize<=0/);
 assert.match(api,/if\(!uri.startsWith\('file:\/\/'\)\)/);
 assert.match(api,/source.copy\(copy\)/);
 assert.match(api,/temporary.push\(copy\)/);
 assert.match(api,/for\(const file of temporary\)/);
 assert.match(api,/confirmedSocialMediaReceipt\(confirmed,files.map\(file=>file.mimeType\),path.includes\('\/stories'\)\)/);
 assert.match(read('src/lib/social-upload-receipt.d.cts'),/confirmedSocialMediaReceipt\(/);
});

test('mobile posts may contain only media, with no invented mandatory caption',()=>{
 const api=read('src/lib/social-feed-api.ts');
 assert.doesNotMatch(api,/Partilhei um momento desportivo/);
 assert.match(api,/const caption=content\.trim\(\)/);
 assert.match(api,/sendMedia\('\/api\/feed\/posts',\{content:caption/);
 assert.match(api,/if\(caption\)item=await createTextPost/);
});
test('optional post location uses backend supported 160 character limit',()=>{
 const api=read('src/lib/social-feed-api.ts');
 const feed=read('app/(tabs)/index.tsx');
 const types=read('src/lib/types.ts');
 assert.match(api,/if\(place\.length>160\)/);
 assert.match(api,/location:place/);
 assert.match(feed,/placeholder="Adicionar localização \(opcional\)"/);
 assert.match(feed,/maxLength=\{160\}/);
 assert.match(feed,/publishPost\(body,media,actor,username,place\)/);
 assert.match(feed,/item\.location\?\.trim\(\)/);
 assert.match(types,/location\?:string\|null/);
});
