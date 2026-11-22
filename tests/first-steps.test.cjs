const test=require('node:test');const assert=require('node:assert');
const {POPULAR,MAX_SPORTS,sportChoices,toggleSport,shouldOffer,skipFileName}=require('../src/lib/first-steps-core.cjs');
const catalog=['Andebol','Futebol','Padel','Xadrez','Ténis','Natação'];
test('popular sports first, filter searches whole catalog',()=>{
 assert.deepStrictEqual(sportChoices(catalog,'',[]),POPULAR.filter(s=>catalog.includes(s)));
 assert.deepStrictEqual(sportChoices(catalog,'xa',[]),['Xadrez']);
 assert.deepStrictEqual(sportChoices(catalog,'tenis',[]),['Ténis']);
 assert.deepStrictEqual(sportChoices(catalog,'',['Xadrez'])[0],'Xadrez');
});
test('toggle respects the maximum',()=>{
 assert.deepStrictEqual(toggleSport(['A'],'A'),[]);
 const full=Array.from({length:MAX_SPORTS},(_,i)=>'S'+i);
 assert.strictEqual(toggleSport(full,'X').length,MAX_SPORTS);
});
test('offer only when needed and not skipped',()=>{
 assert.strictEqual(shouldOffer({needed:true},false),true);
 assert.strictEqual(shouldOffer({needed:true},true),false);
 assert.strictEqual(shouldOffer({needed:false},false),false);
 assert.strictEqual(shouldOffer(null,false),false);
 assert.strictEqual(skipFileName('Ana/../x'),'first-steps-ana_.._x.txt');
});
test('primeiros passos sugerem comunidades públicas das modalidades escolhidas',()=>{
 const {suggestedCommunities}=require('../src/lib/first-steps-core.cjs');
 const futsal=[{id:1,visibility:'PUBLIC'},{id:2,visibility:'PRIVATE'},{id:3,visibility:'PUBLIC'}];
 const padel=[{id:4,visibility:'PUBLIC'},{id:1,visibility:'PUBLIC'},{id:5,visibility:'PUBLIC'}];
 // Alternates between sports, skips private, duplicates and communities already joined.
 assert.deepEqual(suggestedCommunities([futsal,padel],[5],8).map(g=>g.id),[1,4,3]);
 assert.deepEqual(suggestedCommunities([futsal,padel],[],2).map(g=>g.id),[1,4]);
 assert.deepEqual(suggestedCommunities([],[],8),[]);
});
