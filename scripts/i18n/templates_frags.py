"""1) `Texto ${a}` -> t('Texto {a}',{a:...})   2) t(' X') -> ' '+t('X')   3) t('A {v}',{v:E})+t(' B') -> t('A {v} B',{v:E})"""
import re,sys
PT=re.compile(r"[a-zà-ÿ]{3,} [a-zà-ÿ]{2,}")
def tmpl(s,fn):
    out='';i=0;n=0
    while True:
        k=s.find('`',i)
        if k<0: out+=s[i:]; break
        # find closing backtick, skipping ${...} with nesting
        j=k+1;parts=[];buf='';ok=True
        while j<len(s) and s[j]!='`':
            if s.startswith('${',j):
                d=0;e=j+1;q=None
                while e<len(s):
                    c=s[e]
                    if q:
                        if c=='\\': e+=2; continue
                        if c==q: q=None
                    elif c in "'\"": q=c
                    elif c=='`': ok=False; break
                    elif c=='{': d+=1
                    elif c=='}':
                        d-=1
                        if d==0: break
                    e+=1
                if not ok: break
                parts.append(('lit',buf)); buf=''
                parts.append(('expr',s[j+2:e])); j=e+1
            else:
                buf+=s[j]; j+=1
        if not ok or j>=len(s): out+=s[i:k+1]; i=k+1; continue
        parts.append(('lit',buf))
        lit=''.join(v for t,v in parts if t=='lit')
        if not PT.search(lit) or "'" in lit or '\\' in lit:
            out+=s[i:j+1]; i=j+1; continue
        names='abcdefgh';text='';params=[];x=0
        for t_,v in parts:
            if t_=='lit': text+=v
            else: text+='{'+names[x]+'}'; params.append(names[x]+':'+v.strip()); x+=1
        rep=f"{fn}('{text}'"+(",{"+','.join(params)+"})" if params else ")")
        out+=s[i:k]+rep; i=j+1; n+=1
    return out,n
def run(p):
    s=open(p).read(); fn='tr' if re.search(r"t as tr\b",s) else 't'
    s,n=tmpl(s,fn)
    # 3) merge trailing fragment
    s=re.sub(fn+r"\('((?:[^'\\]|\\.)*)',(\{[^{}]*\})\)\+"+fn+r"\('( (?:[^'\\]|\\.)*)'\)",lambda m:f"{fn}('{m.group(1)}{m.group(3)}',{m.group(2)})",s)
    # 2) leading/trailing spaces
    s=re.sub(r"(?<![\w.])"+fn+r"\('(\s*(?:·\s*)?)((?:[^'\\]|\\.)*?)(\s*)'(\)|,)",lambda m:(("'"+m.group(1)+"'+") if m.group(1) else '')+fn+"('"+m.group(2)+"'"+m.group(4)+(("+'"+m.group(3)+"'") if m.group(3) and m.group(4)==')' else '') if (m.group(1) or (m.group(3) and m.group(4)==')')) and m.group(2) else m.group(0),s)
    open(p,'w').write(s); print(p,n)
for p in sys.argv[1:]: run(p)
