const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=p=>untranslate(fs.readFileSync(path.join(root,p),'utf8'));
const core=require('../src/lib/chat-attachments-core.cjs');

test('CJS attachment helpers used by TypeScript screens have matching public declarations',()=>{
 const declarations=source('src/lib/chat-attachments-core.d.cts');
 for(const name of Object.keys(core)){
  assert.match(declarations,new RegExp('(?:const|function)\\s+'+name+'\\b'),name+' lacks a TS declaration');
 }
 for(const name of ['recentPreviewMessageIds','verifiedLocalChatMediaSize','measuredPhotoSize']){
  assert.equal(typeof core[name],'function',name);
 }
});
test('shared native size check and bounded album preview are typed at their consumer import sites',()=>{
 const types=source('src/lib/chat-attachments-core.d.cts');
 assert.match(types,/verifiedLocalChatMediaSize\(actualSize:number,type:'image'\|'video'\):number/);
 assert.match(types,/recentPreviewMessageIds\(/);
 assert.match(types,/attachments\?:PrivateAttachmentMeta\[\]\|null/);
 assert.match(source('src/lib/chat-photo-source.ts'),/import \{verifiedLocalChatMediaSize\} from '\.\/chat-attachments-core\.cjs'/);
 for(const file of ['app/messages/[peer].tsx','src/components/CommunityChatPanel.tsx','src/components/SessionChatPanel.tsx'])
  assert.match(source(file),/chatAttachmentList,recentPreviewMessageIds/);
});
