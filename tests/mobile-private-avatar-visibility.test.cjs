'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const feed=fs.readFileSync(path.join(__dirname,'../app/(tabs)/index.tsx'),'utf8');
const video=fs.readFileSync(path.join(__dirname,'../src/components/FeedVideo.tsx'),'utf8');
const image=fs.readFileSync(path.join(__dirname,'../src/components/PostImageLightbox.tsx'),'utf8');

test('feed and story avatars authorize protected private photos and show initials on failure',()=>{
 const avatar=feed.slice(feed.indexOf('function CircleAvatar('),feed.indexOf('function SectionHeader('));
 assert.match(avatar,/const \{token\}=useAuth\(\)/);
 assert.match(avatar,/source=\{mediaRequestSource\(src,token\)\}/);
 assert.match(avatar,/onError=\{\(\)=>setFailed\(true\)\}/);
 assert.match(avatar,/useEffect\(\(\)=>\{setFailed\(false\);\},\[src,token\]\)/);
 assert.match(avatar,/src&&!failed\?/);
 assert.match(avatar,/startLetter\(name\)/);
});

test('private story mentions and media viewers preserve the authenticated source',()=>{
 assert.match(feed,/<CircleAvatar name=\{friend\.nickname\|\|friend\.fullName\|\|friend\.username\} image=\{friend\.profilePicUrl\} size=\{36\}\/>/);
 assert.match(feed,/source=\{mediaRequestSource\(uri,token\)\}/);
 assert.match(video,/mediaRequestSource\(uri,token\)/);
 assert.match(image,/mediaRequestSource\(uri,token\)/);
});
