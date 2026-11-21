const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/components/SessionChatPanel.tsx'),'utf8');

test('session chat standalone and embedded share measured scroll history',()=>{
 assert.match(source,/\{<ScrollView ref=\{inlineHistoryRef\}/);
 assert.doesNotMatch(source,/\{embedded\?<ScrollView/);
 assert.match(source,/inlineNearBottom\.current=contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-90/);
});
test('refresh does not acknowledge unseen session messages',()=>{
 const refresh=source.slice(source.indexOf('const refresh=useCallback'),source.indexOf('useFocusEffect('));
 assert.doesNotMatch(refresh,/markSessionChatRead\(/);
 assert.match(source,/lastAcknowledgedMessageId\.current=latest/);
});
test('standalone session chat uses compact attachments and does not force page bottom',()=>{
 assert.match(source,/\{auth\.token&&!closed\?<View style=\{styles\.quickActions\}>/);
 assert.match(source,/<ChatPdfComposer compact target=/);
 assert.doesNotMatch(source,/<Page autoScrollToEnd>/);
 assert.match(source,/if\(composerFocused\.current&&inlineNearBottom\.current\)/);
});

test('session chat opens newest history once per focus, like the community chat',()=>{
 const community=fs.readFileSync(path.join(__dirname,'../src/components/CommunityChatPanel.tsx'),'utf8');
 for(const view of [source,community]){
  assert.match(view,/const firstHistoryPositionPending=useRef\(true\)/);
  assert.match(view,/firstHistoryPositionPending\.current=true/);
  assert.match(view,/firstHistoryPositionPending\.current&&/);
  assert.match(view,/inlineHistoryRef\.current\?\.scrollToEnd\(\{animated:false\}\)/);
  assert.match(view,/if\(inlineNearBottom\.current\)inlineHistoryRef\.current\?\.scrollToEnd\(\{animated:true\}\)/);
 }
 const scroll=source.slice(source.indexOf('onScroll={event=>'),source.indexOf('onLayout={event=>'));
 assert.match(scroll,/if\(firstHistoryPositionPending\.current(?:\|\|initialAutoScrollPending\.current)?\)return/);
 const layout=source.slice(source.indexOf('onLayout={event=>'),source.indexOf('contentContainerStyle={{gap:8,padding:8}}'));
 assert.match(layout,/firstHistoryPositionPending\.current=false/);
 assert.match(layout,/entries\.length>0&&historyContentHeight\.current>0/);
 assert.match(layout,/entries\.length>0&&historyViewportHeight\.current>0/);
});
