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
 assert.match(api,/requireViewer\(token,username\)/);
 assert.match(api,/item\.authorUsername\.toLowerCase\(\)===username!\.toLowerCase\(\)/);
 assert.match(api,/confirmedTextPostReceipt\(updated,username!,description,place\)/);
});
test('post editing is exposed only to author, in feed and full post details',()=>{
 const feed=read('app/(tabs)/index.tsx');
 const detail=read('app/posts/[postId]/index.tsx');
 assert.match(feed,/postMenuItem\.authorUsername\.toLowerCase\(\)===auth\.username\.toLowerCase\(\)/);
 assert.match(feed,/Editar publicação e multimédia/);
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
 assert.match(editor,/onSaved\(result,replacing\)/);
 assert.match(editor,/maxLength=\{1000\}/);
 assert.match(editor,/maxLength=\{160\}/);
});

test('Android menu uses a native sheet rather than more than three Alert buttons',()=>{
 const feed=read('app/(tabs)/index.tsx');
 assert.match(feed,/<Modal visible=\{identityMatches&&!!postMenuItem\}/);
 assert.match(feed,/accessibilityLabel="Editar publicação"/);
 assert.match(feed,/accessibilityLabel="Ocultar do meu feed"/);
 assert.match(feed,/accessibilityLabel="Eliminar publicação"/);
 assert.match(feed,/accessibilityLabel="Cancelar opções da publicação"/);
 assert.doesNotMatch(feed,/Alert\.alert\('Opções de publicação'/);
});

test('editing post media uses explicit replacement consent and the server media endpoint',()=>{
 const api=read('src/lib/social-feed-api.ts');
 const editor=read('src/components/PostEditSheet.tsx');
 assert.match(api,/export async function replacePostMedia\(/);
 assert.match(api,/\/api\/feed\/posts\/\$\{postId\}\/media/);
 assert.match(api,/replaceMedia:'true'/);
 assert.match(api,/files,token!,'PUT',true/);
 assert.match(api,/forceFilesParts\|\|files\.length>1\?'files'/);
 assert.match(api,/confirmedTextPostReceipt\(confirmed,username!,description,place\)/);
 assert.match(editor,/Alert\.alert\('Substituir multimédia\?'/);
 assert.match(editor,/onPress:\(\)=>\{void persist\(\);\}/);
 assert.match(editor,/launchImageLibraryAsync/);
 assert.match(editor,/selectionLimit:6/);
 assert.match(editor,/albumError\(files,true\)/);
 assert.match(editor,/setReplacementMedia\(\[\]\)/);
 assert.match(editor,/accessibilityLabel=\{'Fotografia nova '\+\(index\+1\)\}/);
 assert.match(editor,/file\.type==='image'\?<Image/);
 assert.match(editor,/if\(!text\.trim\(\)&&!replacing&&postMediaItems\(post\)\.length===0\)/);
 assert.match(editor,/replacePostMedia\(post\.postId!,replacementMedia,text,location,token,username\)/);
});
