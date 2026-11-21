const test=require('node:test');const assert=require('node:assert');
const {sessionFilters,cleanQuery,sections}=require('../src/lib/global-search-core.cjs');
test('sport text searches games by sport, else by city',()=>{
 assert.deepStrictEqual(sessionFilters('padel',['Padel','Futebol']),{sport:'Padel'});
 assert.deepStrictEqual(sessionFilters('Pádel',['Padel']),{sport:'Padel'});
 assert.deepStrictEqual(sessionFilters(' Porto ',['Padel']),{city:'Porto'});
 assert.strictEqual(sessionFilters('a',['Padel']),null);
});
test('query cleaning',()=>{
 assert.strictEqual(cleanQuery(' x '),'');
 assert.strictEqual(cleanQuery('ab\u0000c'),'ab c');
 assert.strictEqual(cleanQuery('z'.repeat(100)).length,80);
});
test('sections cap and total',()=>{
 const r=sections({a:[1,2,3,4,5,6,7],b:[],c:null});
 assert.deepStrictEqual(r.sections.a,[1,2,3,4,5]);assert.strictEqual(r.total,5);assert.deepStrictEqual(r.sections.c,[]);
});
