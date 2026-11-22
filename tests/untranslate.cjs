// Older source-contract tests check the Portuguese texts as they were written
// before translation. This rewrites the translated forms back into the original
// Portuguese shapes so those checks keep their meaning:
//   ={t('X')} -> ="X"            >{t('X')}< -> >X<          t('X') / tr('X') -> 'X'
//   >{t('{a} pts',{a:p})}<  -> >{p} pts<
//   t('Texto {a}',{a:x})    -> 'Texto '+x                    'A'+'B' -> 'AB'
function params(src){
 // "{a:x,b:(y+1)}" -> {a:'x',b:'(y+1)'}; returns null for anything too complex.
 const body=src.slice(1,-1);const out={};let depth=0,key='',val='',inVal=false,q=null;
 for(const c of body+','){
  if(q){val+=c;if(c===q)q=null;continue;}
  if(inVal&&(c==="'"||c==='"'||c==='`')){q=c;val+=c;continue;}
  if(c==='('||c==='['||c==='{')depth++;
  if(c===')'||c===']'||c==='}')depth--;
  if(depth===0&&c===','){if(!key.trim())return null;out[key.trim()]=(inVal?val:key).trim();key='';val='';inVal=false;continue;}
  if(depth===0&&c===':'&&!inVal){inVal=true;continue;}
  if(inVal)val+=c;else key+=c;
 }
 return out;
}
function call(s,i){
 // s[i..] starts with t(' or tr('; returns {end,text,args} or null.
 const open=s.indexOf("('",i);let j=open+2,text='';
 while(j<s.length&&s[j]!=="'"){if(s[j]==='\\'){text+=s[j+1];j+=2;continue;}text+=s[j++];}
 j++;
 if(s[j]===')')return {end:j+1,text,args:null};
 if(s[j]!==',')return null;
 let k=j+1,depth=0,q=null;const start=k;
 for(;k<s.length;k++){const c=s[k];
  if(q){if(c==='\\'){k++;continue;}if(c===q)q=null;continue;}
  if(c==="'"||c==='"'||c==='`'){q=c;continue;}
  if(c==='('||c==='['||c==='{')depth++;
  else if(c===')'||c===']'||c==='}'){if(depth===0)break;depth--;}
 }
 const args=params(s.slice(start,k).trim());
 return args?{end:k+1,text,args}:null;
}
function once(source){
 let s=String(source),out='',i=0;
 const re=/(?<![\w.$])tr?\('/g;let m;
 while((m=re.exec(s))){
  const c=call(s,m.index);if(!c)continue;
  const before=s.slice(i,m.index);
  const jsxChild=/>\{$/.test(s.slice(0,m.index))&&s[c.end]==='}'&&s[c.end+1]==='<';
  const attr=/=\{$/.test(s.slice(0,m.index))&&s[c.end]==='}';
  let rep;
  if(!c.args){
   rep=jsxChild?c.text:attr?'"'+c.text+'"':"'"+c.text.replace(/'/g,"\\'")+"'";
  }else if(jsxChild){
   rep=c.text.replace(/\{(\w+)\}/g,(x,k)=>k in c.args?'{'+c.args[k]+'}':x);
  }else{
   const wrap=e=>/^[\w.$]+(\([^()]*\))?$/.test(e)||/^\(.*\)$/.test(e)?e:'('+e+')';
   const parts=c.text.split(/(\{\w+\})/).filter(Boolean).map(p=>{const k=p.match(/^\{(\w+)\}$/);return k&&k[1] in c.args?wrap(c.args[k[1]]):"'"+p.replace(/'/g,"\\'")+"'";});
   rep=parts.join('+');
  }
  if(jsxChild){out+=before.slice(0,-1)+rep;i=c.end+1;}
  else if(attr&&!c.args){out+=before.slice(0,-1)+rep;i=c.end+1;}
  else{out+=before+rep;i=c.end;}
  re.lastIndex=i;
 }
 s=out+s.slice(i);
 for(let n=0;n<3;n++)s=s.replace(/'((?:[^'\\\n]|\\.)*)'\+'((?:[^'\\\n]|\\.)*)'/g,"'$1$2'");
 return s;
}
module.exports=function untranslate(source){
 let s=String(source);
 for(let n=0;n<3;n++){const next=once(s);if(next===s)break;s=next;}
 return s;
};
