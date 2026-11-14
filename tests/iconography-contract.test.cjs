'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('the Jynlo mobile icon system uses one real vector provider and active variants',()=>{
 const pkg=require('../package.json');
 assert.equal(pkg.dependencies['@expo/vector-icons'],'15.0.3');
 const source=read('src/components/JynloIcon.tsx');
 assert.match(source,/from '@expo\/vector-icons\/Ionicons'/);
 for(const name of ['home','explore','messages','profile','plus','post','community','session','tournament','championship','notifications','camera','gallery','like','comment','share','location','close'])
  assert.match(source,new RegExp('\\b'+name+':\\{regular:'));
 assert.match(source,/active\?pair\.active:pair\.regular/);
});
test('bottom navigation never uses Unicode glyphs as pseudo icons',()=>{
 const source=read('app/(tabs)/_layout.tsx');
 for(const name of ['home','explore','messages','profile'])
  assert.ok(source.includes('name="'+name+'"'),name+' should have a vector icon');
 assert.doesNotMatch(source,/symbol="[▣⌕✉◉]"/);
 assert.match(source,/name="session"/);
 assert.match(source,/name="tournament"/);
 assert.match(source,/name="championship"/);
});
test('feed reactions, notifications and media pickers use Jynlo icon components',()=>{
 const source=read('app/(tabs)/index.tsx');
 for(const name of ['notifications','like','comment','share','camera','gallery','more'])
  assert.ok(source.includes('name="'+name+'"'),name+' should be wired');
 assert.doesNotMatch(source,/<Text style=\{styles\.actionIcon\}>[♧↗]<\/Text>/);
 assert.doesNotMatch(source,/<Text style=\{styles\.headerIcon\}>♧<\/Text>/);
});
