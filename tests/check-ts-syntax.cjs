'use strict';
// Syntax-only check; full type checking requires Expo dependencies.
const fs=require('node:fs'),path=require('node:path');
let ts;
try { ts=require('typescript'); }
catch {
  const {execFileSync}=require('node:child_process');
  const globalRoot=execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8'}).trim();
  ts=require(path.join(globalRoot,'typescript'));
}
const root=path.resolve(__dirname,'..');
let count=0,errors=[];
function visit(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){
 const p=path.join(dir,d.name);if(d.isDirectory()){if(!['node_modules','.expo'].includes(d.name))visit(p);continue;}
 if(!/\.tsx?$/.test(p))continue;
 count++;
 const src=fs.readFileSync(p,'utf8');
 const f=ts.createSourceFile(p,src,ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 for(const e of f.parseDiagnostics)errors.push(`${path.relative(root,p)}:${f.getLineAndCharacterOfPosition(e.start).line+1}: ${ts.flattenDiagnosticMessageText(e.messageText,' ')}`);
}}
visit(path.join(root,'app'));visit(path.join(root,'src'));
console.log(`TS/TSX syntax: ${count} files, ${errors.length} error(s)`);
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
