const test=require('node:test');const assert=require('node:assert');
const fs=require('node:fs');const path=require('node:path');
const {pickLanguage,translate,placeholders,localeTag}=require('../src/lib/i18n-core.cjs');
const {EN}=require('../src/lib/i18n-en.cjs');
const root=path.join(__dirname,'..');

/** Screens already translated: no visible Portuguese may be added without t(). */
const TRANSLATED=['app/welcome.tsx','app/login.tsx','app/search.tsx','app/first-steps.tsx',
 'app/(tabs)/explore.tsx','app/(tabs)/_layout.tsx','app/(tabs)/profile.tsx','app/_layout.tsx',
 'src/components/UI.tsx','app/sessions/[id].tsx','app/sessions/create.tsx'];

test('language: saved choice, else the phone language',()=>{
 assert.strictEqual(pickLanguage('en','pt-PT'),'en');
 assert.strictEqual(pickLanguage(null,'pt-BR'),'pt');
 assert.strictEqual(pickLanguage(null,'en-US'),'en');
 assert.strictEqual(pickLanguage(null,'es-ES'),'en');
 assert.strictEqual(pickLanguage('xx',null),'pt');
 assert.strictEqual(localeTag('en'),'en-GB');
});

test('translate falls back to Portuguese and fills placeholders',()=>{
 const d={'Olá {name}':'Hello {name}'};
 assert.strictEqual(translate(d,'en','Olá {name}',{name:'Ana'}),'Hello Ana');
 assert.strictEqual(translate(d,'pt','Olá {name}',{name:'Ana'}),'Olá Ana');
 assert.strictEqual(translate(d,'en','Sem tradução'),'Sem tradução');
 assert.strictEqual(translate(d,'en','{x} fica',{}),'{x} fica');
});

function sources(){
 const out=[];const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){
  const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(tsx?|cjs)$/.test(e.name)&&!e.name.startsWith('i18n-en'))out.push(fs.readFileSync(p,'utf8'));}};
 walk(path.join(root,'app'));walk(path.join(root,'src'));return out.join('\n');
}

test('every English entry is used, complete and keeps the placeholders',()=>{
 const code=sources();
 for(const [pt,en] of Object.entries(EN)){
  const quoted=["'"+pt.replace(/'/g,"\\'")+"'",'"'+pt+'"'];
  assert.ok(quoted.some(q=>code.includes(q)),'unused entry: '+pt);
  assert.ok(en.trim(),'empty: '+pt);
  assert.deepStrictEqual(placeholders(en),placeholders(pt),'placeholders: '+pt);
  assert.ok(!/[ãõçê]/.test(en.replace(/André/g,'')),'Portuguese left in English: '+en);
 }
});

test('translated screens: every t() text has an English entry, and no visible Portuguese is left out',()=>{
 const missing=[],loose=[];
 for(const f of TRANSLATED){
  const s=fs.readFileSync(path.join(root,f),'utf8');
  for(const m of s.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)){const k=m[1].replace(/\\'/g,"'");if(!(k in EN))missing.push(f+': '+k);}
  for(const m of s.matchAll(/>([^<>{}()=;&|\n]*[A-Za-zÀ-ÿ]{3,} [^<>{}()=;&|\n]*)</g))loose.push(f+': '+m[1].trim());
  for(const m of s.matchAll(/(title|placeholder|accessibilityLabel|subtitle)="([^"]*[a-zà-ÿ][^"]*)"/g))loose.push(f+': '+m[2]);
  // Portuguese words inside `template ${strings}` are invisible to t().
  for(const m of s.matchAll(/`([^`]*)`/g)){let plain=m[1];for(let i=0;i<6;i++)plain=plain.replace(/\{[^{}]*\}/g,'');plain=plain.replace(/\$/g,'');if(/[a-zà-ÿ]{3,} [a-zà-ÿ]{2,}/.test(plain))loose.push(f+': `'+m[1].slice(0,60));}
 }
 assert.deepStrictEqual(missing,[]);
 assert.deepStrictEqual(loose,[]);
});
