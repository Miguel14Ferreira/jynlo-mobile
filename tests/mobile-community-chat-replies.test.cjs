'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('community replies preserve backend contract for text and attachment messages',()=>{
 const api=read('src/lib/chat-api.ts');
 assert.match(api,/sendCommunityMessage\(id:number,body:string,token:string,username:string,replyToMessageId\?:number\|null\)/);
 assert.match(api,/!Number.isSafeInteger\(replyToMessageId\)/);
 assert.match(api,/body:\{body:text,\.\.\.\(replyToMessageId!=null\?\{replyToMessageId\}:\{\}\)\}/);
 const types=read('src/lib/types.ts');
 assert.match(types,/replyToSender\?:string\|null;replyToText\?:string\|null/);
});
test('community chat UI supports quoted reply selection, rendering and cancellation',()=>{
 const screen=read('app/communities/[id]/chat.tsx');
 assert.match(screen,/\[reply,setReply\]=useState<CommunityChatEntry\|null>\(null\)/);
 assert.match(screen,/messages\.map\(m=><View/);
 assert.match(screen,/accessibilityLabel=\{'Responder a '\+m.username\}/);
 assert.match(screen,/onPress=\{\(\)=>setReply\(m\)\}/);
 assert.match(screen,/m\.replyToSender/);
 assert.match(screen,/m\.replyToText/);
 assert.match(screen,/accessibilityLabel="Cancelar resposta"/);
 assert.match(screen,/setReply\(null\)/);
});
test('all community reply send paths preserve selected message and clear only after success',()=>{
 const screen=read('app/communities/[id]/chat.tsx');
 assert.match(screen,/await sendCommunityMessage\(id,message,token,username,originalReplyId\)/);
 assert.match(screen,/sendChatPhotoAlbum\(\{scope:'community',id\},token,\[selectedPhoto,\.\.\.extraPhotos\],originalReplyId,captionToSend\)/);
 assert.match(screen,/sendChatPhoto\('community',id,token,selectedPhoto,originalReplyId\)/);
 assert.match(screen,/replyId=\{reply\?\.id\}/);
 assert.match(screen,/onSent=\{async\(sentReplyId\)=>/);
 assert.match(screen,/setReply\(current=>current\?\.id===originalReplyId\?null:current\)/);
});
