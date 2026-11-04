const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Primeira entrada mostra escolha explícita e bloqueia feed até visitante ou conta',()=>{
 const root=read('app/_layout.tsx'),welcome=read('app/welcome.tsx'),feed=read('app/(tabs)/index.tsx');
 assert.ok(root.includes('name="welcome"'));
 assert.ok(feed.includes('!auth.token&&!auth.browsingAsGuest'));
 assert.ok(feed.includes('Redirect href="/welcome"'));
 assert.ok(welcome.includes('auth.browseAsGuest()'));
 assert.ok(welcome.includes('Explorar como visitante'));
 assert.ok(welcome.includes('Experimentar conta fictícia'));
});
test('Demo é opcional e registo é encaminhado ao site oficial',()=>{
 const auth=read('src/lib/auth.tsx'),welcome=read('app/welcome.tsx'),login=read('app/login.tsx');
 assert.ok(auth.includes('browsingAsGuest:boolean'));
 assert.ok(auth.includes('setBrowsingAsGuest(false)'));
 assert.ok(auth.includes('const loginDemo=useCallback'));
 assert.ok(welcome.includes('d24sports.com/login/registerNewUser'));
 assert.ok(login.includes('As contas reais não funcionam nesta demonstração.'));
});
test('Logout leva à escolha inicial',()=>{
 assert.ok(read('app/(tabs)/profile.tsx').includes("router.replace('/welcome')"));
});