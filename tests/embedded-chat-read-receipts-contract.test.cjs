const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const panels = [
  {name:'session', file:'SessionChatPanel.tsx', receipt:'markSessionChatRead', list:'entries', denied:'closed'},
  {name:'community', file:'CommunityChatPanel.tsx', receipt:'markCommunityRead', list:'messages', denied:'accessRevoked'},
];

for (const {name,file,receipt,list,denied} of panels) {
  const source = fs.readFileSync(path.join(__dirname,'../src/components',file),'utf8');
  const scrollStart = source.indexOf('onScroll={event=>');
  const layoutStart = source.indexOf('onLayout={event=>',scrollStart);
  const contentStart = source.indexOf('onContentSizeChange={',layoutStart);
  const contentEnd = source.indexOf('contentContainerStyle=',contentStart);
  test(name+' chat has complete embedded viewport callbacks',()=>{
    assert.ok(scrollStart>=0&&layoutStart>scrollStart&&contentStart>layoutStart&&contentEnd>contentStart);
  });
  const scroll = source.slice(scrollStart,layoutStart);
  const layout = source.slice(layoutStart,contentStart);
  const content = source.slice(contentStart,contentEnd);
  test(name+' chat ignores stale scroll measurements and requires visible end before read',()=>{
    assert.match(scroll,/if\(firstHistoryPositionPending\.current\)return/);
    assert.match(scroll,/Math\.abs\(contentSize\.height-historyContentHeight\.current\)>2/);
    assert.match(scroll,/Math\.abs\(layoutMeasurement\.height-historyViewportHeight\.current\)>2/);
    assert.match(scroll,/lastMessageVisible=contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-4/);
    assert.match(scroll,/if\(lastMessageVisible&&AppState\.currentState==='active'/);
    assert.match(scroll,new RegExp('!'+denied));
    assert.match(scroll,new RegExp(receipt+'\\('));
  });
  test(name+' chat acknowledges short histories only when fully fitted and authorized',()=>{
    for(const callback of [layout,content]){
      assert.match(callback,/!firstHistoryPositionPending\.current&&inlineNearBottom\.current&&!unseenBelow/);
      assert.match(callback,/AppState\.currentState==='active'/);
      assert.match(callback,new RegExp('!'+denied));
      assert.match(callback,new RegExp(receipt+'\\('));
      assert.match(callback,new RegExp(list+'\\.reduce\\('));
    }
    assert.match(layout,/historyContentHeight\.current<=historyViewportHeight\.current/);
    assert.match(content,/height<=historyViewportHeight\.current/);
    assert.match(content,/composerFocused\.current&&!unseenBelow/);
  });
  test(name+' chat retries failed receipts without acknowledging them permanently',()=>{
    for(const callback of [scroll,layout,content]){
      assert.match(callback,/lastAcknowledgedMessageId\.current=latest/);
      assert.match(callback,/\.catch\(\(\)=>\{if\(lastAcknowledgedMessageId\.current===latest\)lastAcknowledgedMessageId\.current=0;\}\)/);
    }
  });
}
