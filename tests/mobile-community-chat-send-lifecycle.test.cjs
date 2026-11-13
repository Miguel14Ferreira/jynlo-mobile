'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/communities/[id]/chat.tsx'),'utf8');
const focus=source.slice(source.indexOf('useFocusEffect(useCallback('),source.indexOf('async function send()'));
const send=source.slice(source.indexOf('async function send()'),source.indexOf('async function choosePhoto()'));
const picker=source.slice(source.indexOf('async function choosePhoto('),source.indexOf('async function uploadPhoto()'));
const upload=source.slice(source.indexOf('async function uploadPhoto()'),source.indexOf('const recentPhotoIds='));
test('community sender and uploader keep server writes isolated to originating account',()=>{
 assert.match(send,/const version=generation\.current,token=auth\.token,username=auth\.username/);
 assert.match(send,/const confirmed=await sendCommunityMessage\(id,message,token,username,originalReplyId\)/);
 assert.match(upload,/sendChatPhoto\('community',id,token,selectedPhoto,originalReplyId\)/);
 assert.match(upload,/sendChatPhotoAlbum\(/);
 for(const action of [send,upload]){
  assert.match(action,/if\(version!==generation\.current\)return/);
  assert.match(action,/pendingWrites\.current\.delete\(identity\)/);
  assert.match(action,/if\(activeChat\.current===identity\)/);
 }
});
test('community chat locks duplicate sends and preserves text typed after send begins',()=>{
 assert.match(send,/sendingNow\.current\|\|uploadingNow\.current/);
 assert.match(send,/pendingWrites\.current\.has\(identity\)/);
 assert.match(send,/pendingWrites\.current\.set\(identity,'text'\)/);
 assert.match(send,/setDraft\(current=>current===originalDraft\?'':current\)/);
 assert.match(upload,/pendingWrites\.current\.set\(identity,'photo'\)/);
});
test('community chat refocus preserves draft but revalidates membership and history',()=>{
 assert.match(focus,/const changedAccountOrCommunity=focusedIdentity\.current!==identity/);
 const changed=focus.slice(focus.indexOf('if(changedAccountOrCommunity){'),focus.indexOf("// History requires fresh membership validation"));
 for(const reset of ["setDraft('')","setReply(null)","setPhoto(null)","setExtraPhotos([])","setAttachmentCaption('')"])assert.ok(changed.includes(reset),reset);
 const ordinary=focus.slice(focus.indexOf("// History requires fresh membership validation"));
 assert.match(ordinary,/setMessages\(\[\]\);setName\('Comunidade'\)/);
 assert.doesNotMatch(ordinary,/setDraft\(''\)|setPhoto\(null\);setExtraPhotos\(\[\]\)/);
});
test('community camera/gallery is lazy, bounded and ignores stale or revoked results',()=>{
 assert.match(picker,/const ImagePicker=await import\('expo-image-picker'\)/);
 assert.match(picker,/selectionLimit:remaining/);
 assert.match(picker,/appendChatMediaSelection\(current,selected\.assets\)/);
 assert.match(picker,/auth\.token!==token\|\|selected\.canceled/);
 assert.match(picker,/activeChat\.current!==identity\|\|revokedRef\.current\|\|!canSendPhoto/);
 assert.match(picker,/pickerInFlight\.current=true/);
 assert.match(picker,/finally\{pickerInFlight\.current=false;\}/);
});
test('returning to a community restores pending locks instead of resending',()=>{
 assert.match(source,/pendingWrites=useRef\(new Map<string,'text'\|'photo'>\(\)\)/);
 assert.match(focus,/const pending=pendingWrites\.current\.get\(identity\)/);
 assert.match(focus,/sendingNow\.current=Boolean\(pending\)/);
 assert.match(focus,/setSending\(pending==='text'\);setUploading\(pending==='photo'\)/);
 assert.doesNotMatch(focus,/sendingNow\.current=false;uploadingNow\.current=false/);
});
