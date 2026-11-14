'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('profile gallery uses unified vector icons for locations and engagement',()=>{
 const s=read('src/components/ProfilePosts.tsx');
 for(const name of ['gallery','video','like','comment','location'])assert.ok(s.includes('name="'+name+'"'),name);
 assert.doesNotMatch(s,/⌖|♡|▤/);
});
test('Story location stickers keep the label with a vector pin',()=>{
 const s=read('src/components/StoryDetailsView.tsx');
 assert.match(s,/name="location"/);
 assert.match(s,/numberOfLines=\{2\}/);
 assert.doesNotMatch(s,/⌖/);
});
test('post editor has an icon close control and preserves native accessibility label',()=>{
 const s=read('src/components/PostEditSheet.tsx');
 assert.match(s,/name="close"/);
 assert.match(s,/accessibilityLabel="Fechar edição da publicação"/);
 assert.doesNotMatch(s,/style=\{styles.closeText\}>✕/);
});
