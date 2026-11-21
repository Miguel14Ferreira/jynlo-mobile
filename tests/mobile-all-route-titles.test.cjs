'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=path.join(__dirname,'../app');
const layout=fs.readFileSync(path.join(app,'_layout.tsx'),'utf8');
function screens(folder,parts=[]){
 return fs.readdirSync(folder,{withFileTypes:true}).flatMap(entry=>{
  if(entry.name==='(tabs)'||entry.name.startsWith('+'))return [];
  const next=path.join(folder,entry.name);
  if(entry.isDirectory())return screens(next,[...parts,entry.name]);
  if(!entry.name.endsWith('.tsx')||entry.name==='_layout.tsx')return [];
  return [[...parts,entry.name.slice(0,-4)].join('/')];
 });
}
test('every root navigation destination has a human-readable title',()=>{
 const declarations=[...layout.matchAll(/<Stack\.Screen name="([^"]+)" options=\{\{([^}]+)\}\}/g)];
 const titles=new Map(declarations.map(([,route,options])=>[route,options]));
 for(const route of screens(app)){
  assert.ok(titles.has(route),`Missing Stack.Screen declaration for ${route}`);
  const options=titles.get(route);
  if(/headerShown:false/.test(options))continue; // Intentionally full-screen welcome flow.
  assert.match(options,/title:\s*['"][^'"]+['"]/,`Route ${route} needs a readable title`);
  assert.doesNotMatch(options,/\b(?:id|username|peer|postId|championshipId)\b/,`Route ${route} must not expose a raw parameter as its title`);
 }
});

test('route parameters are not displayed as raw screen headers',()=>{
 for(const route of ['sessions/create','social/[username]/index','social/[username]/[kind]',
  'communities/[id]/championships/create','communities/[id]/championships/[championshipId]',
  'communities/[id]/championships/honours','communities/[id]/championships/teams',
  'communities/[id]/competitions','tournaments/[communityId]/[id]/events','tournaments/[communityId]/[id]/relays']){
  assert.ok(layout.includes(`<Stack.Screen name="${route}" options={{title:`),route);
 }
});

test('root stack declares every route at most once',()=>{
 const routes=[...layout.matchAll(/<Stack\.Screen name="([^"]+)"/g)].map(([,route])=>route);
 assert.equal(new Set(routes).size,routes.length,
  'Duplicate Stack.Screen names can make navigation ambiguous: '+routes.filter((route,index)=>routes.indexOf(route)!==index).join(', '));
 assert.equal(routes.filter(route=>route==='communities/[id]/championships/events').length,1);
});
