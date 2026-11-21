const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {buildReport,createSendGate,MAX_PER_RUN,REPEAT_WINDOW_MS}=require('../src/lib/client-error-core.cjs');

test('builds a report from an Error with name, stack and path-only route',()=>{
 const error=new TypeError('x is undefined');
 const report=buildReport(error,{platform:'android',appVersion:'0.16.7',route:'/sessions/12?invite=abc#top',fatal:true});
 assert.equal(report.platform,'android');
 assert.equal(report.message,'TypeError: x is undefined');
 assert.equal(report.route,'/sessions/12');
 assert.equal(report.fatal,true);
 assert.ok(report.stack.length>0);
});

test('accepts strings and error-like objects, rejects empty or unknown input',()=>{
 assert.equal(buildReport('boom',{platform:'ios'}).message,'boom');
 assert.equal(buildReport({message:'odd'},{platform:'web'}).message,'odd');
 assert.equal(buildReport(new Error(''),{platform:'ios'}),null);
 assert.equal(buildReport(undefined,{platform:'ios'}),null);
 assert.equal(buildReport('boom',{platform:'windows'}),null);
 assert.equal(buildReport('boom',{platform:'ios'}).fatal,false);
});

test('cuts long messages and stacks',()=>{
 const report=buildReport({message:'a'.repeat(5000),stack:'b'.repeat(9000)},{platform:'android'});
 assert.equal(report.message.length,300);
 assert.equal(report.stack.length,1500);
});

test('send gate drops repeats within a minute and caps a run',()=>{
 let now=0;
 const gate=createSendGate(()=>now);
 const a=buildReport('same',{platform:'android'});
 assert.equal(gate(a),true);
 assert.equal(gate(a),false);
 now+=REPEAT_WINDOW_MS;
 assert.equal(gate(a),true);
 let sent=2;
 for(let i=0;i<50;i++)if(gate(buildReport('e'+i,{platform:'android'})))sent++;
 assert.equal(sent,MAX_PER_RUN);
 assert.equal(gate(null),false);
});

test('the app never sends the login token with error reports',()=>{
 const code=fs.readFileSync(path.join(__dirname,'..','src/lib/client-error.ts'),'utf8');
 assert.doesNotMatch(code,/Authorization/);
 assert.match(code,/credentials:'omit'/);
 assert.match(code,/\/api\/client-errors/);
 const layout=fs.readFileSync(path.join(__dirname,'..','app/_layout.tsx'),'utf8');
 assert.match(layout,/installGlobalErrorReporting\(\);/);
 assert.match(layout,/<ErrorRouteTracker\/>/);
});
