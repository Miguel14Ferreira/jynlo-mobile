// Large system font: titles of 26 px or more grow at most 130% (like iOS large
// titles), so words are not split letter by letter. Body text keeps the full
// system scale. This guards every screen against a new title without the cap.
const test=require('node:test');const assert=require('node:assert');
const fs=require('node:fs');const path=require('node:path');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
 const p=path.join(dir,e.name);return e.isDirectory()?files(p):p.endsWith('.tsx')?[p]:[];});}
const root=path.join(__dirname,'..');
test('big titles cap their font scaling',()=>{
 const missing=[];
 for(const f of [...files(path.join(root,'app')),...files(path.join(root,'src'))]){
  const s=fs.readFileSync(f,'utf8');
  const big=new Set([...s.matchAll(/\b([a-zA-Z]+):\{[^{}]*?fontSize:(?:2[6-9]|[3-9][0-9]|[1-9][0-9]{2})\b[^{}]*\}/g)].map(m=>m[1]));
  if(!big.size)continue;
  for(const m of s.matchAll(/<Text\b(?:[^<>{}]|\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})*?>/g)){
   const names=[...m[0].matchAll(/styles\.([a-zA-Z]+)/g)].map(x=>x[1]);
   if(names.some(n=>big.has(n))&&!m[0].includes('maxFontSizeMultiplier'))missing.push(path.relative(root,f)+': '+m[0].slice(0,80));
  }
 }
 assert.deepStrictEqual(missing,[]);
});
test('the header brand and the home logo never push the icons off screen',()=>{
 const ui=fs.readFileSync(path.join(root,'src/components/UI.tsx'),'utf8');
 assert.match(ui,/maxFontSizeMultiplier=\{1\.2\} style=\{styles\.brandTitle\}/);
 const home=fs.readFileSync(path.join(root,'app/(tabs)/index.tsx'),'utf8');
 assert.match(home,/maxFontSizeMultiplier=\{1\.2\} style=\{styles\.brandName\}/);
});
