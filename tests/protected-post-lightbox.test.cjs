const untranslate=require('./untranslate.cjs');
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>untranslate(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));

test('expanding private post media uses authenticated server URL, not disposable cache path',()=>{
 const media=read('src/components/ProtectedPostMedia.tsx');
 assert.match(media,/onExpand\(src\.startsWith\('\/api\/profile-media\/'\)\?\(resolveJynloMedia\(src\)\|\|uri\):uri\)/);
 const detail=read('app/posts/[postId]/index.tsx');
 assert.match(detail,/source=\{mediaRequestSource\(expandedImage,auth\.token\)\}/);
 assert.doesNotMatch(detail,/source=\{\{uri:expandedImage\}\}/);
});

test('private media URL headers are restricted to the configured Jynlo backend',()=>{
 const helper=read('src/lib/protected-media-source.ts');
 assert.match(helper,/uri\.startsWith\(base\+'\/api\/profile-media\/'\)/);
 assert.match(helper,/Authorization:'Bearer '\+token/);
});
