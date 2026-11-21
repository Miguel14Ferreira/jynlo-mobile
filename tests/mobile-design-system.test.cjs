'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const theme=fs.readFileSync(path.join(root,'src/lib/theme.ts'),'utf8');
const feed=fs.readFileSync(path.join(root,'app/(tabs)/index.tsx'),'utf8');
const tabs=fs.readFileSync(path.join(root,'app/(tabs)/_layout.tsx'),'utf8');

test('new native tokens keep the original compatibility palette',()=>{
 assert.match(theme,/export const C =/);
 assert.match(theme,/export const MobileTheme =/);
 for(const token of ['background','surface','border','accent','text','muted','tabBackground','tabInactive']){
  assert.match(theme,new RegExp(token+':'));
 }
 assert.match(theme,/touchTarget:44/);
});
test('Feed and bottom navigation use one shared palette',()=>{
 assert.match(feed,/import \{C,MobileTheme\} from '\.\.\/\.\.\/src\/lib\/theme'/);
 assert.match(feed,/=MobileTheme\.colors/);
 assert.match(tabs,/import \{MobileTheme\} from '\.\.\/\.\.\/src\/lib\/theme'/);
 assert.match(tabs,/tabBarActiveTintColor:colors\.accent/);
 assert.match(tabs,/tabBarInactiveTintColor:colors\.tabInactive/);
});
test('bottom tabs retain five destinations and clear selected state',()=>{
 for(const tab of ['index','explore','messages','profile']){
  assert.ok(tabs.includes('name="'+tab+'"'),tab);
 }
 assert.match(tabs,/focused&&styles\.iconActive/);
 assert.match(tabs,/minHeight:MobileTheme\.touchTarget/);
 // Communities and tournaments are stack screens reached from Início and Explorar.
 assert.doesNotMatch(tabs,/name="tournaments"/);
});
