'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const screen=fs.readFileSync(path.join(__dirname,'../app/messages/[peer].tsx'),'utf8');
const focus=screen.slice(screen.indexOf('useFocusEffect(useCallback('),screen.indexOf('function toggleMute()'));
const send=screen.slice(screen.indexOf('async function send()'),screen.indexOf('async function choosePhoto()'));
const picker=screen.slice(screen.indexOf('async function choosePhoto('),screen.indexOf('async function uploadPhoto()'));
const upload=screen.slice(screen.indexOf('async function uploadPhoto()'),screen.indexOf('const recentPhotoIds='));
test('direct chat history is scoped to account and revalidated on refocus',()=>{
 assert.match(screen,/const generation=useRef\(0\),conversation=useRef\(''\)/);
 assert.match(focus,/const identity=peer\+'\|'\+auth\.token/);
 assert.match(focus,/if\(conversation\.current!==identity\)\{/);
 assert.match(focus,/setMessages\(\[\]\);setLoading\(true\)/);
 assert.match(focus,/generation\.current\+\+;blockCheckRequest\.current\+\+/);
 assert.match(screen,/if\(version!==generation\.current\)return/);
});
test('direct chat refocus preserves an unsent album and caption for the same account',()=>{
 const changed=focus.slice(focus.indexOf('if(conversation.current!==identity){'),focus.indexOf('const version=++generation.current'));
 for(const reset of ["setDraft('')","setPhoto(null)","setExtraPhotos([])","setAttachmentCaption('')"])assert.ok(changed.includes(reset),reset);
 const ordinary=focus.slice(focus.indexOf('// Revalidate private history'));
 assert.doesNotMatch(ordinary,/setPhoto\(null\);setExtraPhotos\(\[\]\)/);
 assert.match(focus,/setPhotoAvailable\(false\);setPhotoAvailabilityError\(''\)/);
});
test('direct messages keep a single-flight lock and never erase later edits',()=>{
 assert.match(send,/pendingWrites\.current\.has\(identity\)/);
 assert.match(send,/pendingWrites\.current\.set\(identity,'text'\)/);
 assert.match(send,/await sendDirectChatReply\(/);
 assert.match(send,/await sendDirectChat\(/);
 assert.match(send,/confirmedDirectChatSend\(/);
 assert.match(send,/if\(version!==generation\.current\|\|conversation\.current!==identity\)return/);
 assert.match(send,/setDraft\(current=>current===originalDraft\?'':current\)/);
 assert.match(send,/pendingWrites\.current\.delete\(identity\)/);
 assert.match(send,/if\(conversation\.current===identity\)/);
});
test('direct photo uploads never erase media in another conversation',()=>{
 assert.match(upload,/pendingWrites\.current\.has\(identity\)/);
 assert.match(upload,/sendChatPhotoAlbum\(/);
 assert.match(upload,/sendDirectPhoto\(peer,auth\.token,photo,originalReplyId\)/);
 assert.match(upload,/if\(version!==generation\.current\|\|conversation\.current!==identity\)return/);
 assert.match(upload,/setPhoto\(null\);setExtraPhotos\(\[\]\);setAttachmentCaption/);
 assert.match(upload,/pendingWrites\.current\.delete\(identity\)/);
});
test('native picker is lazy, bounded and cannot cross chats or bypass access',()=>{
 assert.match(picker,/pickerInFlight\.current=true/);
 assert.match(picker,/const ImagePicker=await import\('expo-image-picker'\)/);
 assert.match(picker,/selectionLimit:remaining/);
 assert.match(picker,/appendChatMediaSelection\(current,selected\.assets\)/);
 assert.match(picker,/auth\.token!==token\|\|selected\.canceled/);
 assert.match(picker,/conversation\.current!==identity\|\|blocked\|\|!blockStatusKnown\|\|!photoAvailable/);
 assert.match(picker,/finally\{pickerInFlight\.current=false;\}/);
});
test('polls and received notifications refresh only the focused conversation',()=>{
 assert.match(focus,/setInterval\(\(\)=>\{/);
 assert.match(focus,/AppState\.currentState==='active'&&!sendingNow\.current/);
 assert.match(focus,/AppState\.addEventListener\('change',state=>/);
 assert.match(focus,/Notifications\.addNotificationReceivedListener\(notification=>/);
 assert.match(focus,/try\{received\?\.remove\(\);\}catch/);
 assert.match(screen,/pendingRefresh\.current=true/);
});
test('read-only PDF completion remains scoped to the current conversation',()=>{
 assert.match(screen,/if\(conversation\.current!==peer\+'\|'\+auth\.token\)return/);
 assert.match(screen,/await refresh\(true,generation\.current\)/);
});
