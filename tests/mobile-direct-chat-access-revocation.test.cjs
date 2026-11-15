'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const chat=fs.readFileSync(path.join(__dirname,'../app/messages/[peer].tsx'),'utf8');
const refresh=chat.slice(chat.indexOf('const refresh:'),chat.indexOf('useFocusEffect(useCallback('));

test('verified direct-chat authorization failures hide cached private history and composer',()=>{
 assert.match(chat,/import \{ApiError,DEMO_MODE\} from '\.\.\/\.\.\/src\/lib\/api'/);
 assert.match(refresh,/const accessRevoked=e instanceof ApiError&&\[401,403,404,410\]\.includes\(e\.status\)/);
 assert.match(refresh,/if\(accessRevoked\)\{/);
 for(const change of ['setMessages([])','setDraft(\'\')','setPhoto(null)','setPhotoAvailable(false)','setBlocked(true)','setBlockStatusKnown(false)'])
  assert.ok(refresh.includes(change),change+' missing from revocation handling');
 assert.match(refresh,/Já não tens acesso a esta conversa/);
});

test('ordinary direct-chat failures are distinguished from access revocation',()=>{
 const catchBody=refresh.slice(refresh.indexOf('}catch(e){'));
 assert.match(catchBody,/\}else if\(silent\)\{/);
 assert.match(catchBody,/histórico apresentado pode estar desatualizado/);
 assert.match(catchBody,/\}else\{\s*setSyncWarning\('Não foi possível sincronizar a conversa/);
 const revoke=catchBody.slice(catchBody.indexOf('if(accessRevoked){'),catchBody.indexOf('}else if(silent){'));
 assert.match(revoke,/setMessages\(\[\]\)/);
 assert.doesNotMatch(catchBody.slice(catchBody.indexOf('}else if(silent){')),/setMessages\(\[\]\)/);
});

test('authorization clearing only applies to the active conversation generation',()=>{
 assert.match(refresh,/if\(version===generation\.current\)\{\s*const accessRevoked/);
 assert.match(refresh,/if\(version!==generation\.current\)return/);
});
