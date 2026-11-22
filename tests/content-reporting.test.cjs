const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=f=>untranslate(fs.readFileSync(path.join(__dirname,'..',f),'utf8'));
const {REPORT_REASONS,composeReportReason}=require('../src/lib/report-reasons.cjs');

test('report reasons compose a clear server note',()=>{
 assert.equal(REPORT_REASONS.length,5);
 assert.equal(composeReportReason('SPAM',''),'Spam ou publicidade');
 assert.equal(composeReportReason('HARASSMENT','  insultos  '),'Assédio, ódio ou ameaças: insultos');
 assert.throws(()=>composeReportReason(null,''),/motivo/);
 assert.throws(()=>composeReportReason('OTHER','  '),/Explica/);
 assert.ok(composeReportReason('OTHER','x'.repeat(2000)).length<=1000);
 assert.doesNotMatch(composeReportReason('OTHER','a\u0000b'),/\u0000/);
});

test('posts, comments and profiles can be reported where they are seen (store requirement)',()=>{
 const api=read('src/lib/user-safety-api.ts');
 assert.match(api,/\/api\/feed\/posts\/\$\{validId\(postId\)\}\/report`/);
 assert.match(api,/\/comments\/\$\{validId\(commentId\)\}\/report`/);
 const feed=read('app/(tabs)/index.tsx');
 assert.match(feed,/accessibilityLabel="Denunciar publicação"/);
 assert.match(feed,/accessibilityLabel=\{'Bloquear @'\+postMenuItem\.authorUsername\}/);
 assert.match(feed,/accessibilityLabel=\{'Denunciar comentário de @'\+c\.authorUsername\}/);
 assert.match(feed,/<ReportSheet inline visible=\{reportTarget\?\.kind==='comment'\}/);
 // Own content is never offered for reporting.
 assert.match(feed,/postMenuItem\.authorUsername\.toLowerCase\(\)!==auth\.username\.toLowerCase\(\)&&postMenuItem\.type==='POST'/);
 const detail=read('app/posts/[postId]/index.tsx');
 assert.match(detail,/accessibilityLabel="Denunciar publicação"/);
 assert.match(detail,/reportComment\(post\.postId,target\.commentId,reason,auth\.token\)/);
 const profile=read('app/social/[username]/index.tsx');
 assert.match(profile,/accessibilityLabel=\{'Denunciar perfil de @'\+name\}/);
 assert.match(profile,/blocked\?'Desbloquear @'\+name:'Bloquear @'\+name/);
 assert.match(profile,/\{!own&&auth\.token\?<View style=\{styles\.safetyRow\}>/);
});

test('blocking hides the author in the feed and resets on account change',()=>{
 const feed=read('app/(tabs)/index.tsx');
 assert.match(feed,/!blockedAuthors\.includes\(item\.authorUsername\.toLowerCase\(\)\)/);
 assert.match(feed,/setReportTarget\(null\);setBlockedAuthors\(\[\]\);/);
});
