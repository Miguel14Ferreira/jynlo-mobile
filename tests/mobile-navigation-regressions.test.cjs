'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=(file)=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('private conversation keeps the composer outside the scrollable history',()=>{
 const code=source('app/messages/[peer].tsx');
 const endHistory=code.indexOf('</ScrollView>');
 const footer=code.indexOf('style={styles.footer}');
 const composer=code.indexOf('style={styles.composer}');
 assert.ok(endHistory>0&&footer>endHistory&&composer>footer);
 assert.match(code,/onContentSizeChange=.*nearBottom\.current/s);
});
test('community-scoped tournament creation does not show other communities',()=>{
 const code=source('app/tournaments/create.tsx');
 assert.match(code,/scopedToCommunity\|\|c\.id===requestedCommunityId/);
 assert.match(code,/scopedToCommunity\?<Text/);
});
test('session organizer detail is fetched before optional anonymous preview',()=>{
 const code=source('app/sessions/[id].tsx');
 const detail=code.indexOf('const full=await sessionDetail(');
 const preview=code.indexOf('setPreview(await sessionPreview(id))');
 assert.ok(detail>=0&&preview>detail);
});

test('chat attachment menu remains mounted and photo confirmation is next to composer',()=>{
 const code=source('app/messages/[peer].tsx');
 assert.match(code,/style=\{\[styles\.attachmentOptions,!attachmentsOpen&&styles\.hidden\]\}/);
 assert.ok(code.indexOf('{photo?<View')>code.indexOf('</ScrollView>'));
 assert.ok(code.indexOf('{photo?<View')<code.indexOf('style={styles.composer}'));
 assert.match(code,/safetyOpen\?<\>/);
});

test('session detail ignores delayed responses after navigation or account changes',()=>{
 const code=source('app/sessions/[id].tsx');
 assert.match(code,/const version=\+\+detailRequestGeneration\.current/);
 assert.match(code,/if\(version!==detailRequestGeneration\.current\)return/);
 assert.match(code,/useFocusEffect\(useCallback\(\(\)=>\{/);
 assert.match(code,/return \(\)=>\{detailRequestGeneration\.current\+\+;\}/);
 assert.match(code,/setPreview\(null\);setParticipants\(\[\]\)/);
});
