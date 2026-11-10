'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../src/lib/optional-notifications.cjs'),'utf8');
function loadWithNative(nativeRequire){
 const module={exports:{}};
 vm.runInNewContext(source,{module,exports:module.exports,require:nativeRequire},{filename:'optional-notifications.cjs',timeout:1000});
 return module.exports.getNativeNotifications;
}

test('app startup survives a missing native notification module',()=>{
 const getNativeNotifications=loadWithNative(()=>{throw Object.assign(new Error('Native module unavailable'),{code:'MODULE_NOT_FOUND'});});
 assert.equal(getNativeNotifications(),null);
});

test('app startup survives a native module that throws during evaluation',()=>{
 const getNativeNotifications=loadWithNative(()=>{throw new Error('Expo notification bridge not ready');});
 assert.equal(getNativeNotifications(),null);
});

test('available native notifications remain usable for authenticated navigation',()=>{
 const native={DEFAULT_ACTION_IDENTIFIER:'default',addNotificationResponseReceivedListener:()=>({remove(){}})};
 const getNativeNotifications=loadWithNative(name=>{
  assert.equal(name,'expo-notifications');
  return native;
 });
 assert.equal(getNativeNotifications(),native);
});

test('native module is not accessed merely by importing the optional loader',()=>{
 let count=0;
 const getNativeNotifications=loadWithNative(()=>{count++;return {}});
 assert.equal(count,0);
 getNativeNotifications();
 assert.equal(count,1);
});
