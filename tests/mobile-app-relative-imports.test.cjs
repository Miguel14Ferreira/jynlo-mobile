'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=path.join(root,'app');
const suffixes=['','.ts','.tsx','.js','.jsx','.cjs','.mjs','.json','.png','.jpg','.jpeg','.webp','.svg'];
const indexSuffixes=['index.ts','index.tsx','index.js','index.jsx','index.cjs'];
function pages(dir){
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())return pages(full);
  return /\.(?:tsx?|jsx?)$/.test(entry.name)?[full]:[];
 });
}
function resolved(file,specifier){
 const target=path.resolve(path.dirname(file),specifier);
 return suffixes.some(extension=>fs.existsSync(target+extension)&&fs.statSync(target+extension).isFile())||
  indexSuffixes.some(index=>fs.existsSync(path.join(target,index)));
}
test('every local import in Expo Router app screens resolves inside the repository',()=>{
 const missing=[];
 for(const file of pages(app)){
  const source=fs.readFileSync(file,'utf8');
  // ESM imports/exports and literal dynamic imports; external packages are handled by Metro.
  const pattern=/(?:\bfrom\s*|\bimport\s*\(|\bimport\s*|\brequire\s*\()\s*['"]((?:\.\.?\/)[^'"]+)['"]/g;
  for(const match of source.matchAll(pattern)){
   if(!resolved(file,match[1]))
    missing.push(path.relative(root,file)+': '+match[1]);
  }
 }
 assert.deepEqual(missing,[],'Unresolved local Metro imports:\n'+missing.join('\n'));
});
