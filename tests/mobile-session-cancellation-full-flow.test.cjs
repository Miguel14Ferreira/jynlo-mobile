const untranslate=require('./untranslate.cjs');
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {cancellationNotice}=require('../src/lib/session-cancellation-notice.cjs');
const read=file=>untranslate(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
const detail=read('app/sessions/[id].tsx');
const feed=read('app/(tabs)/index.tsx');

test('cancellation message identifies sport, Lisbon-local time and public city',()=>{
 const result=cancellationNotice({sport:'Futsal',gameDate:'2026-11-20T21:00:00Z',city:'Lisboa'});
 assert.match(result,/Futsal/);
 assert.match(result,/20\/11\/2026/);
 assert.match(result,/21:00/);
 assert.match(result,/Lisboa/);
 assert.match(result,/não se vai realizar/);
 assert.match(result,/não te desloques ao recinto/);
});
test('cancellation messages never include private session addresses or access codes',()=>{
 const result=cancellationNotice({
  sport:'Padel',gameDate:'2026-11-20T21:00:00Z',city:'Benfica',
  address:'PRIVATE 773',meetingPointInstructions:'PASSCODE-123',
  password:'SECRET-42',latitude:38.7,longitude:-9.2
 });
 for(const secret of ['PRIVATE 773','PASSCODE-123','SECRET-42','38.7','-9.2']){
  assert.equal(result.includes(secret),false);
 }
});
test('cancellation text tolerates legacy null or invalid date values',()=>{
 const result=cancellationNotice({sport:null,gameDate:'invalid',city:null});
 assert.match(result,/Sessão cancelada — desporto/);
 assert.doesNotMatch(result,/Invalid Date|undefined|null/);
});
test('both session detail and feed use the same public-only notice generator',()=>{
 assert.match(detail,/import \{cancellationNotice\} from '\.\.\/\.\.\/src\/lib\/session-cancellation-notice\.cjs'/);
 assert.match(feed,/import \{cancellationNotice\} from '\.\.\/\.\.\/src\/lib\/session-cancellation-notice\.cjs'/);
 assert.match(detail,/cancellationNotice\(detail\):null/);
 assert.match(feed,/Share\.share\(\{message:cancellationNotice\(item\)\}\)/);
});
test('detail share follows a verified cancellation response, not a pending action',()=>{
 const cancel=detail.slice(detail.indexOf('const cancel=()=>'),detail.indexOf('function confirmRemoveParticipant('));
 assert.match(cancel,/void perform\(\(\)=>cancelSession\(id,actorToken,actorUsername\|\|undefined\),/);
 assert.match(detail,/owner&&detail\?\.status==='CANCELLED'&&detail\.id===id/);
 assert.match(detail,/const owner=isOrganizer\(detail,auth\.username\)/);
 assert.match(detail,/Share\.share\(\{message:cancelledShareText\}\)/);
 assert.match(cancel,/style:'destructive'/);
});

test('already cancelled session offers a re-share action on later visits',()=>{
 assert.match(detail,/const cancelledShareText=owner&&detail\?\.status==='CANCELLED'&&detail\.id===id\?/);
 assert.match(detail,/\{cancelledShareText\?<View style=\{\{gap:10\}\}>/);
 assert.match(detail,/<Text selectable style=\{styles\.hint\}>\{cancelledShareText\}<\/Text>/);
 assert.match(detail,/Partilhar aviso de cancelamento/);
 assert.doesNotMatch(detail,/setCancelledShare\(/);
});
