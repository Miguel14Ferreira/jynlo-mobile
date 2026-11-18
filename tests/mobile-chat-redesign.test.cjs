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
 assert.match(community,/await sendCommunityMessage\(id,message,token,username,originalReplyId\)/);
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

test('real-device UX: direct chats remain compact without losing composer or attachments',()=>{
 const direct=source('app/messages/[peer].tsx');
 assert.match(direct,/history:\{paddingHorizontal:12,paddingTop:10,paddingBottom:18,gap:8/);
 assert.match(direct,/message:\{padding:10,/);
 assert.match(direct,/SecureChatAttachment/);
 assert.match(direct,/Escreve uma mensagem privada/);
});
test('real-device UX: inbox mute controls do not occupy a full conversation tile',()=>{
 const inbox=source('app/(tabs)/messages.tsx');
 assert.match(inbox,/muteAction:\{width:44,height:44/);
 assert.match(inbox,/JynloIcon name=\{isConversationMuted/);
 assert.match(inbox,/accessibilityLabel=\{isConversationMuted/);
 assert.match(inbox,/minHeight:72/);
});
test('real-device UX: profile privacy summary collapses, but follow requests remain visible',()=>{
 const privacy=source('src/components/ProfilePrivacySettings.tsx');
 assert.match(privacy,/detailsOpen,setDetailsOpen/);
 assert.match(privacy,/accessibilityState=\{\{expanded:detailsOpen\}\}/);
 assert.match(privacy,/privateModeAvailable/);
 assert.match(privacy,/pending\.map\(item=>/);
});
test('real-device UX: native video call foreground and actions remain accessible',()=>{
 const call=source('src/features/direct-call-screen.tsx');
 assert.match(call,/localVideoCard:\{alignSelf:'flex-end',width:'40%'\}/);
 assert.match(call,/callActions:\{flexDirection:'row'/);
 for(const label of ['Desligar microfone','Desligar câmara','Terminar chamada'])
  assert.ok(call.includes(label),label);
 assert.match(call,/onPress=\{onHangup\}/);
});

test('mobile inbox supports clear category filters without mixing private and group messages',()=>{
 const inbox=source('app/(tabs)/messages.tsx');
 assert.match(inbox,/conversationKind,setConversationKind/);
 for(const kind of ["['all','Todas']","['direct','Privadas']","['community','Comunidades']","['session','Sessões']"])
  assert.ok(inbox.includes(kind),kind);
 assert.match(inbox,/item\.kind===conversationKind/);
 assert.match(inbox,/accessibilityState=\{\{selected:conversationKind===kind\}\}/);
 assert.match(inbox,/filterInbox\(items,search,unreadOnly\)/);
});
test('mobile profile prioritizes sports and social identity over redundant follower copy',()=>{
 const profile=source('app/(tabs)/profile.tsx');
 assert.match(profile,/accessibilityLabel="Ver os meus seguidores"/);
 assert.match(profile,/accessibilityLabel="Ver quem sigo"/);
 assert.doesNotMatch(profile,/Ver pessoas  ›/);
 assert.match(profile,/favoriteSports\.map\(sport=>/);
});

test('mobile UX: direct conversation keeps peer identity and authorized call action fixed above history',()=>{
 const screen=source('app/messages/[peer].tsx');
 assert.match(screen,/fixedChatHeader/);
 assert.match(screen,/accessibilityLabel="Voltar às conversas"/);
 assert.match(screen,/accessibilityLabel="Iniciar chamada com este contacto"/);
 assert.match(screen,/blockStatusKnown&&!blocked&&peer\.toLowerCase\(\)!==auth\.username\?\.toLowerCase\(\)/);
 assert.ok(screen.indexOf('<View style={styles.fixedChatHeader}>')<screen.indexOf('<ScrollView ref={conversationScroll}'));
 assert.match(screen,/historyViewportMeasured\.current/);
 assert.match(screen,/acknowledgeVisibleHistory/);
});
test('mobile UX: profile places account controls behind an accessible expandable section',()=>{
 const profile=source('app/(tabs)/profile.tsx');
 assert.match(profile,/moreOptionsOpen,setMoreOptionsOpen/);
 assert.match(profile,/accessibilityState=\{\{expanded:moreOptionsOpen\}\}/);
 assert.match(profile,/\{moreOptionsOpen\?<\>/);
 assert.ok(profile.indexOf('<ProfilePosts')<profile.indexOf('Mais opções'));
 assert.match(profile,/router\.push\('\/change-password'\)/);
 assert.match(profile,/Eliminar a minha conta/);
});
test('mobile UX: inbox keeps notifications, filters, invites, and mute actions accessible without placeholder symbols',()=>{
 const inbox=source('app/(tabs)/messages.tsx');
 assert.match(inbox,/name="notifications"/);
 assert.match(inbox,/accessibilityLabel="Ver convites e pedidos"/);
 assert.match(inbox,/name=\{item\.kind==='direct'\?'profile'/);
 assert.match(inbox,/onPress=\{\(\)=>setUnreadOnly\(current=>!current\)\}/);
 assert.match(inbox,/accessibilityLabel=\{isConversationMuted/);
});
