'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=(file)=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const files=[
 'app/messages/[peer].tsx',
 'src/components/CommunityChatPanel.tsx',
 'src/components/SessionChatPanel.tsx'
];
test('all chat types use shared tokens and outgoing right-aligned bubbles',()=>{
 for(const file of files){
  const s=source(file);
  assert.match(s,/import \{C,MobileTheme\} from/);
  assert.match(s,/maxWidth:'86%',alignSelf:'flex-start'/);
  assert.match(s,/alignSelf:'flex-end',borderBottomLeftRadius:MobileTheme\.radius\.lg/);
  assert.match(s,/MobileTheme\.colors\.surface/);
  assert.match(s,/MobileTheme\.touchTarget/);
 }
});
test('message delivery remains explicit with no optimistic duplicate sends',()=>{
 const direct=source(files[0]),community=source(files[1]),session=source(files[2]);
 assert.match(direct,/await sendDirectChat\(peer,submittedText,auth\.token\)/);
 assert.match(direct,/pendingWrites\.current\.set\(identity,'text'\)/);
 assert.match(community,/await sendCommunityMessage\(id,message,token,username\)/);
 assert.match(community,/sendingNow\.current=true/);
 assert.match(session,/await postSessionChat\(id,originalDraft,auth\.token,originalReplyId\)/);
 assert.match(session,/pendingWrites\.current\.set\(identity,'text'\)/);
});
test('attachments and private access checks are preserved',()=>{
 const direct=source(files[0]),community=source(files[1]),session=source(files[2]);
 assert.match(direct,/SecureChatAttachment/);
 assert.match(direct,/userBlockStatus\(peer,auth\.token\)/);
 assert.match(direct,/ChatPdfComposer/);
 assert.match(community,/SecureChatAttachment/);
 assert.match(community,/observeCommunityChat/);
 assert.match(community,/ChatPdfComposer/);
 assert.match(session,/SecureChatAttachment/);
 assert.match(session,/markSessionChatRead/);
 assert.match(session,/ChatPdfComposer/);
});
