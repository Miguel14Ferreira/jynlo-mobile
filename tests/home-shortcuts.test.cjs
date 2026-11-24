const test=require('node:test');const assert=require('node:assert/strict');
const h=require('../src/lib/home-shortcuts.cjs');
test('defaults, managers first, saved order kept and capped at six',()=>{
 const plain=h.availableShortcutIds(false,false);
 assert.ok(!plain.includes('my-venues'));assert.ok(!plain.includes('book-court'));
 assert.deepEqual(h.resolveShortcuts(null,plain,false),h.DEFAULT_SHORTCUTS);
 const mgr=h.availableShortcutIds(true,false);
 assert.equal(h.resolveShortcuts(null,mgr,true)[0],'my-venues');
 assert.deepEqual(h.resolveShortcuts(['teams','ghost','create','teams','my-venues'],plain,false),['teams','create']);
 assert.equal(h.resolveShortcuts(h.SHORTCUT_CATALOG.map(s=>s.id),mgr,true).length,6);
});
test('moving a shortcut swaps it with its neighbour and ignores the edges',()=>{
 assert.deepEqual(h.moveShortcut(['a','b','c'],0,1),['b','a','c']);
 assert.deepEqual(h.moveShortcut(['a','b','c'],0,-1),['a','b','c']);
 assert.deepEqual(h.moveShortcut(['a','b','c'],2,1),['a','b','c']);
});
