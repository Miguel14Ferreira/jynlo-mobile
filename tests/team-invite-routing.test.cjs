'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {safeRedirect}=require('../src/lib/routes.cjs');
const {nativeRouteForWebLink}=require('../src/lib/native-app-links.cjs');

test('shared team invite opens the native team profile and survives login',()=>{
 const url='https://d24sports.com/menu/communities/12?tab=tournaments&tournament=34&team=56&teamPage=56';
 const route=nativeRouteForWebLink(url);
 assert.equal(route,'/tournaments/12/34/teams/56');
 assert.equal(safeRedirect(route),route);
});
test('community-only invitations open the native community',()=>{
 assert.equal(nativeRouteForWebLink('https://d24sports.com/menu/communities/12'),'/communities/12');
});
test('reject untrusted and malformed team destinations',()=>{
 assert.equal(safeRedirect('/tournaments/12/34/teams/56/extra'),'/(tabs)');
 assert.equal(safeRedirect('/tournaments/12/34/teams/0'),'/(tabs)');
 assert.equal(safeRedirect('https://evil.example/tournaments/12/34/teams/56'),'/(tabs)');
 assert.equal(safeRedirect('/tournaments/12/34/teams/99999999999999999999'),'/(tabs)');
 assert.equal(nativeRouteForWebLink('https://evil.example/menu/communities/12?team=56&tournament=34'),'https://evil.example/menu/communities/12?team=56&tournament=34');
});
