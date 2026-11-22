const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>untranslate(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));

test('social Stories and posts send Expo File objects rather than unsupported URI dictionaries',()=>{
 const api=read('src/lib/social-feed-api.ts');
 assert.match(api,/new File\(uri\) as unknown as Blob,'jynlo-media\.'\+extension/);
 assert.match(api,/form\.append\(forceFilesParts\|\|files\.length>1\?'files':file\.type==='video'\?'video':'image'/);
 assert.doesNotMatch(api,/form\.append\(files\.length>1\?'files'[\s\S]{0,90}\{\s*uri,/);
 assert.match(api,/Authorization:\s*`Bearer \$\{token\}`/);
 assert.match(api,/confirmedSocialMediaReceipt\(/);
});
test('private, session and community chat media use native Blob-backed files in all flows',()=>{
 const paths=['src/lib/direct-photo-attachment.ts','src/lib/chat-photo-attachment.ts',
  'src/lib/chat-photo-album.ts','src/lib/chat-pdf-attachment.ts'];
 for(const file of paths){
  const source=read(file);
  assert.match(source,/new File\([^)]*\)|form\.append\((?:target\.scope==='team'\?'files':'file'|'file'),file as unknown as Blob/);
  assert.doesNotMatch(source,/form\.append\('(?:file|files)',\{\s*uri:/);
  assert.match(source,/credentials:'omit'/);
 }
});
test('post and Story receipt is inserted directly into the feed after confirmed server success',()=>{
 const home=read('app/(tabs)/index.tsx');
 assert.match(home,/const created=await publishPost\(/);
 assert.match(home,/setPosts\(current=>\[created,\.\.\.current\.filter\(item=>item\.postId!==created\.postId\)\]\)/);
 assert.match(home,/const created=await publishStory\(/);
 assert.match(home,/setOwnStories\(current=>\[created,\.\.\.current\.filter\(item=>item\.id!==created\.id\)\]\)/);
 assert.match(home,/catch\(e\)\{\s*if\(feedIdentity\.current===`\$\{username\}:\$\{actor\}`\)/);
});
test('media upload retains user draft when server confirmation is uncertain',()=>{
 const home=read('app/(tabs)/index.tsx');
 assert.match(home,/postInFlight\.current=true/);
 assert.match(home,/storyInFlight\.current=true/);
 assert.match(home,/if\(unchanged\)\{/);
 assert.match(home,/setPostPublishError\(message\)/);
 assert.match(home,/postInlineError/);
 assert.doesNotMatch(home,/Alert\.alert\('Publicação',message\)/);
 assert.match(home,/Alert\.alert\('Story',message\)/);
});

test('freshly confirmed posts are retained until the authenticated feed catches up',()=>{
 const home=read('app/(tabs)/index.tsx');
 assert.match(home,/const recentlyConfirmedPosts=useRef/);
 assert.match(home,/const recentlyConfirmedStories=useRef/);
 assert.match(home,/entry\.until>Date\.now\(\)&&!received\.some\(item=>item\.postId===entry\.item\.postId\)/);
 assert.match(home,/entry\.until>Date\.now\(\)&&!received\.some\(item=>item\.id===entry\.item\.id\)/);
 assert.match(home,/const merged=\[\.\.\.recentlyConfirmedPosts\.current\.map\(entry=>entry\.item\),\.\.\.visibleReceived\]/);
 assert.match(home,/setOwnStories\(\[\.\.\.recentlyConfirmedStories\.current\.map\(entry=>entry\.item\),\.\.\.received\]\)/);
 assert.match(home,/recentlyConfirmedPosts\.current=\[\.\.\.recentlyConfirmedPosts\.current\.filter/);
 assert.match(home,/recentlyConfirmedStories\.current=\[\.\.\.recentlyConfirmedStories\.current\.filter/);
 assert.match(home,/recentlyConfirmedPosts\.current=\[\];recentlyConfirmedStories\.current=\[\]/);
});


test('replacing media uses the repeated files contract even for one file',()=>{
 const api=read('src/lib/social-feed-api.ts');
 assert.match(api,/const confirmed=await sendMedia\(`\/api\/feed\/posts\/\$\{postId\}\/media`/);
 assert.match(api,/files,token!,'PUT',true\)/);
 assert.match(api,/forceFilesParts\|\|files\.length>1\?'files'/);
});
test('publish notices from previous accounts cannot overwrite the current feed',()=>{
 const screen=read('app/(tabs)/index.tsx');
 assert.match(screen,/if\(feedIdentity\.current===`\$\{username\}:\$\{actor\}`&&linkedSessionId&&created\.sessionId!==linkedSessionId\)/);
 for(const message of [
  'Publicação enviada. Não foi possível atualizar o feed',
  'Story enviada. Não foi possível atualizar o feed'
 ]){
  const index=screen.indexOf(message);
  assert.ok(index>0,message);
  const before=screen.slice(Math.max(0,index-180),index);
  assert.match(before,/if\(feedIdentity\.current===`\$\{username\}:\$\{actor\}`\)/);
 }
});


test('private photo uploads never follow redirects with authenticated bearer tokens',()=>{
 for(const file of ['src/lib/direct-photo-attachment.ts','src/lib/chat-photo-attachment.ts','src/lib/chat-photo-album.ts']){
  const source=read(file);
  assert.match(source,/redirect:'error'/,file);
  assert.match(source,/credentials:'omit'/,file);
  assert.match(source,/Authorization:/,file);
 }
});
test('single photo uploads validate conversation, MIME and the confirmed attachment',()=>{
 const helper=read('src/lib/chat-attachments-core.cjs');
 assert.match(helper,/function confirmedSingleChatPhotoReply\(/);
 assert.match(helper,/Number.isSafeInteger\(reply\.id\)/);
 assert.match(helper,/reply\.attachmentMimeType!==requestedMime/);
 assert.match(helper,/reply\.communityId===conversationId&&reply\.kind==='CHAT'/);
 assert.match(helper,/reply\.sessionId===conversationId/);
 assert.match(helper,/reply\.username2\.toLowerCase\(\)===conversationId\.toLowerCase\(\)/);
 const direct=read('src/lib/direct-photo-attachment.ts');
 const group=read('src/lib/chat-photo-attachment.ts');
 assert.match(direct,/confirmedSingleChatPhotoReply\(message,'direct',peer,mime,replyToMessageId\)/);
 assert.match(group,/confirmedSingleChatPhotoReply\(result,kind,id,asset\.mimeType\|\|'',replyId\)/);
 for(const source of [direct,group]){
  assert.match(source,/catch\{throw Error\('O envio não foi confirmado\./);
  assert.match(source,/histórico antes de repetir|histórico antes de tentar novamente/);
 }
});


test('temporary single-photo copies are cleaned if multipart form preparation throws',()=>{
 for(const file of ['src/lib/direct-photo-attachment.ts','src/lib/chat-photo-attachment.ts']){
  const source=read(file);
  const start=source.indexOf('const prepared=await prepareChatPhoto(asset,extension);');
  const end=source.indexOf('prepared.cleanup();',start);
  assert.ok(start>0&&end>start,file);
  const block=source.slice(start,end+25);
  assert.match(block,/try\{\s*const form=new FormData\(\)/,file);
  assert.match(block,/\}finally\{prepared\.cleanup\(\);\}/,file);
  const availability=source.slice(source.indexOf('export async function'),start);
  assert.match(availability,/credentials:'omit',redirect:'error'/,file);
 }
});


test('mobile post composer keeps caption visible, full-width media, compact controls and inline errors',()=>{
 const home=read('app/(tabs)/index.tsx');
 const composer=home.slice(home.indexOf('<Modal visible={identityMatches&&composerOpen}'),home.indexOf('<Modal visible={identityMatches&&storyComposer}'));
 assert.ok(composer.length>2000);
 assert.ok(composer.indexOf('style={styles.postCaptionBlock}')<composer.indexOf('style={styles.postMediaPreview}'));
 assert.match(composer,/styles\.postMediaPosition/);
 assert.match(composer,/composerMedia\.length===1\?Math\.max\(200,screenWidth-68\)/);
 assert.match(composer,/composerMedia\.length>1\?<Pressable/);
 assert.match(composer,/postPublishError\?<View style=\{styles\.postInlineError\}/);
 assert.doesNotMatch(composer,/media\.fileName/);
 assert.doesNotMatch(composer,/style=\{styles\.errorBox\}/);
 assert.match(home,/mediaChooseButton:\{flex:1,minHeight:76/);
});
test('post media uploads give slow mobile connections time and never retry an uncertain POST',()=>{
 const api=read('src/lib/social-feed-api.ts');
 assert.match(api,/uploadTimeoutMs=path\.startsWith\('\/api\/feed\/posts'\)\?180000:90000/);
 assert.match(api,/responseReceived=true/);
 assert.match(api,/if\(responseReceived\)[\s\S]*?antes de confirmar o resultado/);
 assert.match(api,/Não foi possível obter confirmação do servidor/);
 assert.doesNotMatch(api,/Falha de ligação durante o envio\. Verifica se foi publicado/);
});


test('ambiguous post uploads can be checked without a second POST or losing the draft',()=>{
 const home=read('app/(tabs)/index.tsx');
 assert.match(home,/async function checkRecentlyPublishedPosts\(\)/);
 assert.match(home,/const items=await profilePosts\(username,token,0\)/);
 assert.match(home,/setPostVerifyItems\(items\.filter\(item=>item\.type==='POST'\)\.slice\(0,5\)\)/);
 assert.match(home,/feedIdentity\.current===identity&&postVerifyRevision\.current===revision/);
 const verify=home.slice(home.indexOf('async function checkRecentlyPublishedPosts'),home.indexOf('async function submitPost'));
 assert.doesNotMatch(verify,/publishPost\(|sendMedia\(|setComposerMedia\(|changeComposerMedia\(/);
 assert.match(home,/Ver últimas publicações/);
 assert.match(home,/Esta lista serve apenas para verificares o perfil\. A app não repetiu o envio/);
});


test('uncertain post failures require an explicit choice before a second upload',()=>{
 const {uncertainPostOutcome}=require('../src/lib/post-publish-uncertainty.cjs');
 for(const s of ['Não foi possível obter confirmação do servidor.','O envio demorou demasiado tempo.',
  'O servidor respondeu, mas a ligação interrompeu-se antes de confirmar o resultado.',
  'O servidor Jynlo não conseguiu confirmar o envio. Verifica se foi publicado antes de repetir.'])
  assert.equal(uncertainPostOutcome(s),true,s);
 for(const s of ['O servidor rejeitou um dos ficheiros. (HTTP 415)',
  'Os ficheiros excedem o tamanho permitido pelo servidor. (HTTP 413)',
  'Escolhe uma localização das sugestões ou limpa o campo.',null])
  assert.equal(uncertainPostOutcome(s),false,String(s));
 const home=read('app/(tabs)/index.tsx');
 assert.match(home,/if\(!requireLogin\(\)\|\|postInFlight\.current\|\|!postRetryAcknowledged/);
 assert.match(home,/setPostRetryAcknowledged\(!uncertainPostOutcome\(message\)\)/);
 assert.match(home,/setPostRetryAcknowledged\(true\);setVerifiedPostPlace/);
 assert.match(home,/Já confirmei no perfil · Permitir novo envio/);
 assert.match(home,/disabled=\{\(!composerMedia\.length&&!composerText\.trim\(\)\)\|\|publishing\|\|!postRetryAcknowledged\}/);
});
