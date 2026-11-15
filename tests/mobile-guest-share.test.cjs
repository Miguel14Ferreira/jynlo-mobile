'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const api=fs.readFileSync(path.join(__dirname,'../src/lib/api.ts'),'utf8');
const screen=fs.readFileSync(path.join(__dirname,'../app/sessions/[id].tsx'),'utf8');

test('organizer must request signed guest link from backend, never invent it',()=>{
 assert.match(api,/export async function issueSessionGuestLink/);
 assert.match(api,/\/guest-link`.*,\{token,method:'POST'\}/);
 assert.match(api,/\^\[A-Za-z0-9_-\]\{43\}\$/);
 assert.match(api,/guest=\$\{encodeURIComponent\(reply.token\)\}/);
});
test('sharing warns that new guest link invalidates older invitations',()=>{
 assert.match(screen,/issueSessionGuestLink\(id,auth.token!\)/);
 assert.match(screen,/criar um novo invalida os convites anteriores/);
 assert.match(screen,/text:'Convite sem conta'/);
 assert.match(screen,/Confirma a presença|confirma a presença/);
});
