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
