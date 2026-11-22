const untranslate=require('./untranslate.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const panels = [
  {name:'session', file:'SessionChatPanel.tsx', receipt:'markSessionChatRead', list:'entries', denied:'closed'},
  {name:'community', file:'CommunityChatPanel.tsx', receipt:'markCommunityRead', list:'messages', denied:'accessRevoked'},
];

for (const {name,file,receipt,list,denied} of panels) {
  const source = untranslate(fs.readFileSync(path.join(__dirname,'../src/components',file),'utf8'));
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
    assert.match(scroll,/if\(firstHistoryPositionPending\.current(?:\|\|initialAutoScrollPending\.current)?\)return/);
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

for (const {name,file} of panels) {
  const source = untranslate(fs.readFileSync(path.join(__dirname,'../src/components',file),'utf8'));
  const start = source.indexOf('onScroll={event=>');
  const end = source.indexOf('contentContainerStyle=',start);
  const viewport = source.slice(start,end);
  test(name+' distinguishes auto-follow proximity from visible-end acknowledgement',()=>{
    assert.match(viewport,/inlineNearBottom\.current=contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-90/);
    assert.match(viewport,/const lastMessageVisible=contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-4/);
    assert.match(viewport,/if\(lastMessageVisible&&AppState\.currentState==='active'/);
  });
  test(name+' never auto-follows content changes without composer focus or with unread messages below',()=>{
    assert.match(viewport,/if\(inlineNearBottom\.current&&composerFocused\.current&&!unseenBelow\)inlineHistoryRef\.current\?\.scrollToEnd\(\{animated:true\}\)/);
  });
}

for (const {name,file} of panels) {
  const source = untranslate(fs.readFileSync(path.join(__dirname,'../src/components',file),'utf8'));
  const scrollStart = source.indexOf('onScroll={event=>');
  const layoutStart = source.indexOf('onLayout={event=>',scrollStart);
  const scroll = source.slice(scrollStart,layoutStart);
  test(name+' keeps unread marker until the last message is actually visible',()=>{
    assert.match(scroll,/const lastMessageVisible=contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-4/);
    assert.match(scroll,/if\(lastMessageVisible\)setUnseenBelow\(false\)/);
    assert.doesNotMatch(scroll,/if\(inlineNearBottom\.current\)\{\s*setUnseenBelow\(false\)/);
  });
}

for (const {name,file} of panels) {
  const source = untranslate(fs.readFileSync(path.join(__dirname,'../src/components',file),'utf8'));
  test(name+' jump-to-latest waits for viewport confirmation before clearing unread',()=>{
    const jump = source.match(/onPress=\{\(\)=>\{[^}]*inlineHistoryRef\.current\?\.scrollToEnd\(\{animated:true\}\);\}\}/g) || [];
    assert.ok(jump.length>=1,'expected jump-to-latest action');
    for(const handler of jump){
      assert.doesNotMatch(handler,/setUnseenBelow\(false\)/);
      assert.doesNotMatch(handler,/inlineNearBottom\.current=true/);
    }
    assert.match(source,/if\(lastMessageVisible\)setUnseenBelow\(false\)/);
  });
}
