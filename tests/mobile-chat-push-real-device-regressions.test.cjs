'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('direct chat is safe above Android navigation bar and keyboard',()=>{
 const s=read('app/messages/[peer].tsx');
 assert.match(s,/edges=\{\['top','bottom','left','right'\]\}/);
 assert.match(s,/<KeyboardAvoidingView style=\{styles\.keyboardFrame\} behavior=\{Platform\.OS==='ios'\?'padding':'height'\}/);
 assert.match(s,/<ScrollView ref=\{conversationScroll\} style=\{styles\.historyScroll\}/);
 assert.match(s,/<View style=\{styles\.footer\}>/);
 assert.match(s,/keyboardFrame:\{flex:1\}/);
 assert.match(s,/historyScroll:\{flex:1\}/);
});

test('text draft stays available while auxiliary block-status check is unresolved',()=>{
 const s=read('app/messages/[peer].tsx');
 assert.match(s,/\{auth\.token&&!blocked\?<View style=\{styles\.composer\}>/);
 assert.match(s,/disabled=\{mutationBusy\|\|sending\|\|photoBusy\|\|sendingNow\.current\|\|pendingWrites\.current\.has/);
 assert.match(s,/pendingWrites\.current\.has\(identity\)\|\|blocked\|\|!auth\.token/);
 assert.doesNotMatch(s,/pendingWrites\.current\.has\(identity\)\|\|blocked\|\|!blockStatusKnown/);
 assert.match(s,/await sendDirectChat\(peer,submittedText,auth\.token\)/);
});

test('recent private images load as authenticated inline thumbnails with cache cleanup',()=>{
 const chat=read('app/messages/[peer].tsx');
 const attachment=read('src/components/SecureChatAttachment.tsx');
 assert.match(chat,/recentPreviewMessageIds\(messages\)/);
 assert.match(chat,/autoPreview=\{recentPhotoIds\.has\(m\.id\)&&attachment\.mime\?\.startsWith\('image\/'\)===true\}/);
 assert.match(attachment,/autoPreview=false/);
 assert.match(attachment,/if\(!autoPreview\|\|!token\|\|!mime\?\.startsWith\('image\/'\)/);
 assert.match(attachment,/Authorization:'Bearer '\+token/);
 assert.match(attachment,/redirect:'error'/);
 assert.match(attachment,/inlineImage:\{width:240,height:200/);
 assert.match(attachment,/if\(old\?\.exists\)old\.delete\(\)/);
 assert.match(attachment,/setExpanded\(false\);setUri\(null\)/);
});

test('push activation cannot claim Firebase readiness without client config',()=>{
 const conf=read('app.config.js');
 const push=read('src/lib/mobile-push.ts');
 const screen=read('app/notifications.tsx');
 assert.match(conf,/process\.env\.GOOGLE_SERVICES_JSON/);
 assert.match(conf,/googleServicesFile:firebaseConfigFile/);
 assert.match(conf,/nativePushConfigured: Boolean\(firebaseConfigFile\)/);
 assert.match(push,/Constants\.expoConfig\?\.extra\?\.nativePushConfigured===true/);
 assert.match(screen,/androidPushConfigured\(\)\?<Button/);
 assert.match(screen,/falta configurar o Firebase Android nesta APK/);
});

test('private chat replies use server-verified quoted messages without cross-thread leaks',()=>{
 const api=read('src/lib/chat-api.ts');
 const chat=read('app/messages/[peer].tsx');
 assert.match(api,/export async function sendDirectChatReply\(/);
 assert.match(api,/Number\.isSafeInteger\(replyToMessageId\)/);
 assert.match(api,/body:\{text:body,replyToMessageId\}/);
 assert.match(chat,/if\(originalReply\)await sendDirectChatReply\(peer,submittedText,auth\.token,originalReply\.id\)/);
 assert.match(chat,/setReplyTarget\(current=>current\?\.id===originalReply\.id\?null:current\)/);
 assert.match(chat,/accessibilityLabel="Cancelar resposta"/);
 assert.match(chat,/accessibilityLabel=\{`Responder à mensagem de/);
 assert.match(chat,/setReplyTarget\(null\);setEditing\(null\);setEditText\(''\);setPhoto\(null\);setExtraPhotos\(\[\]\);setAttachmentCaption\(''\);setError\(''\)/);
});
