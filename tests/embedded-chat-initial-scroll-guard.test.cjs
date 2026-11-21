const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Regression contract for the initial scroll/read-receipt race.
// These are source-level safeguards, not a substitute for Android/iOS integration tests.
for (const [kind, file, denied, receipt] of [
  ['session', 'SessionChatPanel.tsx', 'closed', 'markSessionChatRead'],
  ['community', 'CommunityChatPanel.tsx', 'accessRevoked', 'markCommunityRead'],
]) {
  const source = fs.readFileSync(path.join(__dirname, '../src/components', file), 'utf8');
  const start = source.indexOf('onScroll={event=>');
  const end = source.indexOf('onLayout={event=>', start);
  const scroll = source.slice(start, end);

  test(kind + ': automatic initial positioning cannot acknowledge messages', () => {
    assert.ok(start >= 0 && end > start, 'embedded scroll callback exists');
    assert.match(source, /initialAutoScrollPending\.current=true/);
    assert.match(scroll, /if\(firstHistoryPositionPending\.current\|\|initialAutoScrollPending\.current\)return/);
    assert.ok(
      scroll.indexOf('initialAutoScrollPending.current)return') <
      scroll.indexOf('lastMessageVisible='),
      'initial scroll guard must precede visibility/receipt calculation',
    );
  });

  test(kind + ': only deliberate drag or jump releases the initial scroll guard', () => {
    assert.match(source, /onScrollBeginDrag=\{\(\)=>\{initialAutoScrollPending\.current=false;\}\}/);
    assert.match(source, /onPress=\{\(\)=>\{initialAutoScrollPending\.current=false;inlineHistoryRef\.current\?\.scrollToEnd\(\{animated:true\}\);\}\}/);
    assert.doesNotMatch(scroll, /initialAutoScrollPending\.current=false/);
  });

  test(kind + ': receipt still requires a fresh visible end and authorization', () => {
    assert.match(scroll, /Math\.abs\(contentSize\.height-historyContentHeight\.current\)>2/);
    assert.match(scroll, /Math\.abs\(layoutMeasurement\.height-historyViewportHeight\.current\)>2/);
    assert.match(scroll, /const lastMessageVisible=contentOffset\.y\+layoutMeasurement\.height>=contentSize\.height-4/);
    assert.match(scroll, /if\(lastMessageVisible&&AppState\.currentState==='active'/);
    assert.match(scroll, new RegExp('!'+denied));
    assert.match(scroll, new RegExp(receipt+'\\('));
    assert.match(scroll, /\.catch\(\(\)=>\{if\(lastAcknowledgedMessageId\.current===latest\)lastAcknowledgedMessageId\.current=0;\}\)/);
  });
}
