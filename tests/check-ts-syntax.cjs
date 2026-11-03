'use strict';
// A syntax-only check; runtime type checking needs the Expo node_modules installed.
const fs=require('node:fs'),path=require('node:path');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
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
