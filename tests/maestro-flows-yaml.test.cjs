const test=require('node:test');const assert=require('node:assert');
const fs=require('node:fs');const path=require('node:path');const yaml=require('js-yaml');
// A Maestro flow that does not parse wastes a full emulator run (~40 min): check them here.
test('every Maestro flow is valid YAML with a config and a list of steps',()=>{
 const dir=path.join(__dirname,'..','.maestro');
 for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.yaml'))){
  const docs=yaml.loadAll(fs.readFileSync(path.join(dir,file),'utf8'));
  assert.equal(docs.length,2,file);
  assert.equal(docs[0].appId,'com.jynlo.app',file);
  assert.ok(Array.isArray(docs[1])&&docs[1].length>0,file);
 }
});
