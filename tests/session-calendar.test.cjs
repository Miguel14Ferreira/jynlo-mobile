'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const cal=require('../src/lib/session-calendar.cjs');
const session={id:7,sport:'Futsal',gameDate:'2026-12-04T21:00:00Z',city:'Odivelas',creatorUsername:'miguel'};

test('Google Calendar gets a start AND an end (90 min by default)',()=>{
 const url=new URL(cal.googleCalendarUrl(session,'Pavilhão Municipal',Date.parse('2026-11-21T00:00:00Z')));
 assert.equal(url.searchParams.get('action'),'TEMPLATE');
 assert.equal(url.searchParams.get('dates'),'20261204T210000Z/20261204T223000Z');
 assert.equal(url.searchParams.get('text'),'Jynlo — Futsal');
 assert.equal(url.searchParams.get('location'),'Pavilhão Municipal, Odivelas');
 assert.match(url.searchParams.get('details'),/https:\/\/d24sports\.com\/sessions\/7/);
});
test('without permission to see the address only the city goes in the event',()=>{
 const url=new URL(cal.googleCalendarUrl(session,null,Date.parse('2026-11-21T00:00:00Z')));
 assert.equal(url.searchParams.get('location'),'Odivelas');
});
test('past games and invalid dates give no link',()=>{
 assert.equal(cal.googleCalendarUrl(session,null,Date.parse('2026-12-05T00:00:00Z')),null);
 assert.equal(cal.googleCalendarUrl({...session,gameDate:'x'},null),null);
});
test('the button is shown to players and the organiser, never for cancelled sessions',()=>{
 const screen=read('app/sessions/[id].tsx');
 assert.match(screen,/\(detail\?\.joined\|\|owner\)&&detail&&detail\.status!=='CANCELLED'\?\n\s*<AddToCalendarButton session=\{detail\} exactAddress=\{safeExactAddress\(detail,auth\.username\)\}/);
 const button=read('src/components/AddToCalendarButton.tsx');
 assert.match(button,/url\.startsWith\('https:\/\/calendar\.google\.com\/calendar\/render\?'\)/);
 assert.match(button,/Adicionar ao calendário/);
});
