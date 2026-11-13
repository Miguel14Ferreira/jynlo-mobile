'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('post editor uses authenticated backend edit endpoint without touching media',()=>{
 const api=read('src/lib/social-feed-api.ts');
 assert.match(api,/export async function editPost\(/);
 assert.match(api,/request<FeedItem>\(\x60\/api\/feed\/posts\/\$\{postId\}\x60/);
 assert.match(api,/token,method:'PUT',body:\{content:description,location:place\|\|null\}/);
 assert.match(api,/description\.length>1000/);
 assert.match(api,/place\.length>160/);
 assert.match(api,/item\.authorUsername\.toLowerCase\(\)===username!\.toLowerCase\(\)/);
});
test('post editing is exposed only to author, in feed and full post details',()=>{
 const feed=read('app/(tabs)/index.tsx');
 const detail=read('app/posts/[postId]/index.tsx');
 assert.match(feed,/if\(own&&item\.type==='POST'&&item\.postId\)/);
 assert.match(feed,/Editar texto e localização/);
 assert.match(feed,/<PostEditSheet post=\{identityMatches\?editingPost:null\}/);
 assert.match(detail,/accessibilityLabel="Editar texto e localização da publicação"/);
 assert.match(detail,/<PostEditSheet post=\{editingPost&&post/);
});
test('post editor prevents empty text-only posts and protects unsaved changes',()=>{
 const editor=read('src/components/PostEditSheet.tsx');
 assert.match(editor,/postMediaItems\(post\)\.length===0/);
 assert.match(editor,/Descartar alterações\?/);
 assert.match(editor,/lock\.current=true;setBusy\(true\)/);
 assert.match(editor,/generation\.current/);
 assert.match(editor,/onSaved\(result\)/);
 assert.match(editor,/maxLength=\{1000\}/);
 assert.match(editor,/maxLength=\{160\}/);
});
