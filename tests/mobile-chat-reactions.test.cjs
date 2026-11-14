'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const screens={
 direct:read('app/messages/[peer].tsx'),
 community:read('src/components/CommunityChatPanel.tsx'),
 session:read('src/components/SessionChatPanel.tsx')
};
test('each chat renders the same message reaction controls and bulk-loads per conversation',()=>{
 for(const [kind,src] of Object.entries(screens)){
  assert.match(src,/import \{ChatReactionRow,useChatReactions\} from/);
  assert.match(src,new RegExp("useChatReactions\\('"+kind+"'"));
  assert.match(src,/<ChatReactionRow id=\{m.id\}/);
  assert.match(src,/summary=\{reactions.summaries\[m.id\]\}/);
  assert.match(src,/busy=\{reactions.busyIds.has\(m.id\)\}/);
  assert.match(src,/onReact=\{reactions.react\}/);
  assert.match(src,/onInspect=\{reactions.inspect\}/);
  assert.match(src,/!m.deletedAt\?<ChatReactionRow/);
 }
});
test('reaction API uses authorized server endpoints with strict fixed emoji set',()=>{
 const api=read('src/lib/chat-reactions-api.ts');
 assert.match(api,/\/api\/messages\/reactions\//);
 assert.match(api,/CHAT_REACTION_EMOJIS:readonly ChatReactionEmoji\[\]=\['👍','❤️','😂','🎉','👏','🔥'\]/);
 assert.match(api,/if\(ids.length>100\|\|new Set\(ids\).size!==ids.length\)/);
 assert.match(api,/validateMessageId\(messageId\)/);
 assert.match(api,/method:emoji===null\?'DELETE':'PUT'/);
 assert.match(api,/body:\{emoji\}/);
 assert.match(api,/if\(checked.messageId!==messageId\)/);
 assert.match(api,/return result.map\(checkedSummary\).filter\(item=>allowed.has\(item.messageId\)\)/);
});
test('reaction loads are bounded, account-scoped and do not retry ambiguous writes',()=>{
 const ui=read('src/components/ChatReactionRow.tsx');
 assert.match(ui,/messageIds.filter\(id=>Number.isSafeInteger\(id\)&&id>0\).slice\(-60\)/);
 assert.match(ui,/if\(AppState.currentState!=='active'\)return/);
 assert.match(ui,/const interval=setInterval\(refresh,30000\)/);
 assert.match(ui,/return\(\)=>\{active=false;clearInterval\(interval\);\}/);
 assert.match(ui,/if\(!token\|\|!enabled\|\|pending.current.has\(identity\+'\|'\+messageId\)\)return/);
 assert.match(ui,/if\(activeIdentity.current===currentIdentity\)/);
 assert.match(ui,/Alert.alert\('Reação não confirmada'/);
 assert.doesNotMatch(ui,/setSummaries\(previous=>\(\{\.\.\.previous,\[messageId\]:\{.*emoji/);
});
test('reaction picker is compact, reversible and accessible for all six choices',()=>{
 const ui=read('src/components/ChatReactionRow.tsx');
 assert.match(ui,/accessibilityLabel=\{open\?'Fechar reações':'Reagir à mensagem'\}/);
 assert.match(ui,/accessibilityLabel=\{'Reagir com '\+emoji\}/);
 assert.match(ui,/summary\?\.myEmoji===emoji\?null:emoji/);
 assert.match(ui,/counts.map\(emoji=>/);
 assert.match(ui,/disabled=\{busy\}/);
});

test('reaction participant details are fetched only on demand with server authorization',()=>{
 const api=read('src/lib/chat-reactions-api.ts');
 const ui=read('src/components/ChatReactionRow.tsx');
 assert.match(api,/export async function chatReactionParticipants\(/);
 assert.match(api,/endpoint\(kind,id\)\+'\/'\+messageId\+'\/participants'/);
 assert.match(api,/if\(!token\|\|DEMO_MODE\)throw Error/);
 assert.match(api,/result.slice\(0,200\).filter/);
 assert.match(ui,/onLongPress=\{\(\)=>\{if\(!busy\)void onInspect\(id,emoji\);\}\}/);
 assert.match(ui,/selected.slice\(0,25\)/);
 assert.match(ui,/activeIdentity\.current!==currentIdentity/);
 assert.match(ui,/member.displayName/);
});
