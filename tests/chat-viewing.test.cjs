'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('an open chat tells the server it is on screen, so no alerts are created for it',()=>{
 const hook=read('src/lib/chat-viewing.ts');
 assert.match(hook,/\/api\/messages\/inbox\/viewing/);
 assert.match(hook,/AppState\.currentState==='active'/);
 for(const [file,kind] of [['app/messages/[peer].tsx','direct'],['src/components/CommunityChatPanel.tsx','community'],
   ['src/components/SessionChatPanel.tsx','session'],['app/groups/[id].tsx','private'],['src/components/SportsTeamContentPanel.tsx','team']])
  assert.match(read(file),new RegExp("useChatViewing\\('"+kind+"'"),file);
 assert.match(read('src/lib/use-unread-messages.ts'),/onUnreadChanged/);
});
