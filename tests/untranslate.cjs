// Older source-contract tests check the Portuguese texts as they were written
// before translation. This turns ={t('X')} back into ="X" and t('X') into 'X'
// (only simple calls without parameters), so those checks keep their meaning.
module.exports=function untranslate(source){
 return String(source)
  .replace(/=\{t\('((?:[^'\\"]|\\.)*)'\)\}/g,(m,v)=>'="'+v.replace(/\\'/g,"'")+'"')
  .replace(/>\{t\('((?:[^'\\]|\\.)*)'\)\}</g,(m,v)=>'>'+v.replace(/\\'/g,"'")+'<')
  .replace(/\bt\(('(?:[^'\\]|\\.)*')\)/g,'$1');
};
