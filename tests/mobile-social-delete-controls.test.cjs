const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('story deletion is shown only for server-authorized authors or community admins',()=>{
 const feed=read('app/(tabs)/index.tsx');
 const api=read('src/lib/social-feed-api.ts');
 assert.match(feed,/story\.canDelete\?<Pressable/);
 assert.match(feed,/if\(!story\|\|!story\.canDelete\|\|!token\|\|submittingStory\.current\)return/);
 assert.match(feed,/Alert\.alert\('Eliminar Story\?'/);
 assert.match(feed,/void deleteStory\(storyId,actorToken\)/);
 assert.match(api,/\/api\/stories\/\$\{storyId\}/);
});
test('only the post owner sees a confirmed permanent deletion option',()=>{
 const post=read('app/posts/[postId]/index.tsx');
 const api=read('src/lib/social-feed-api.ts');
 assert.match(post,/post\.authorUsername\.toLowerCase\(\)===auth\.username\.toLowerCase\(\)/);
 assert.match(post,/accessibilityLabel="Eliminar a minha publicação"/);
 assert.match(post,/Alert\.alert\('Eliminar publicação\?'/);
 assert.match(post,/deletePost\(id,token\)/);
 assert.match(api,/\/api\/feed\/posts\/\$\{postId\}/);
});

test('permanent profile publications can be shared from their full detail',()=>{
 const source=read('app/posts/[postId]/index.tsx');
 assert.match(source,/import \{[^}]*Share[^}]*\} from 'react-native'/);
 assert.match(source,/async function sharePost\(\)/);
 assert.match(source,/sharedPostLink\(post\)/);
 assert.match(source,/await Share\.share\(\{message:contents\}\)/);
 assert.match(source,/accessibilityLabel="Partilhar publicação"/);
 assert.doesNotMatch(source,/https:\/\/d24sports\.com\/posts\/\$\{id\}/);
});
