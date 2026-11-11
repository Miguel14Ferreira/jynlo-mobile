'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {checkPushReadiness}=require('../scripts/check-push-readiness.cjs');

test('push readiness resolves the same Expo project as EAS builds',()=>{
 const result=checkPushReadiness({});
 assert.equal(result.projectIdConfigured,true,'EAS project UUID must come from app.config.js');
 assert.equal(result.ready,true,`Push config should be ready: ${result.issues.join('; ')}`);
});
