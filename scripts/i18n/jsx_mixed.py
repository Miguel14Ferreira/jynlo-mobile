"""<Text …>Texto {expr} mais texto</Text>  ->  <Text …>{t('Texto {a} mais texto',{a:expr})}</Text>"""
import re,sys
def split(content):
    parts=[];i=0;buf=''
    while i<len(content):
        c=content[i]
        if c=='{':
            depth=0;j=i;q=None
            while j<len(content):
                ch=content[j]
                if q:
                    if ch=='\\': j+=2; continue
                    if ch==q: q=None
                elif ch in "'\"`": q=ch
                elif ch=='{': depth+=1
                elif ch=='}':
                    depth-=1
                    if depth==0: break
                j+=1
            if buf: parts.append(('lit',buf)); buf=''
            parts.append(('expr',content[i+1:j])); i=j+1
        else: buf+=c; i+=1
    if buf: parts.append(('lit',buf))
    return parts
def run(p):
    s=open(p).read(); n=0
    def fix(m):
        nonlocal n
        open_tag,content=m.group(1),m.group(2)
        if '<' in content or "t('" in content.split('{')[0]: return m.group(0)
        parts=split(content)
        lits=''.join(v for k,v in parts if k=='lit')
        if not re.search(r"[A-Za-zÀ-ÿ]{3,}",lits) or not any(k=='expr' for k,_ in parts): return m.group(0)
        if any(k=='expr' and v.strip().startswith('t(') and len(parts)==1 for k,v in parts): return m.group(0)
        names='abcdefgh';text='';params=[];idx=0
        for k,v in parts:
            if k=='lit': text+=v.replace("'","\\'")
            else:
                nm=names[idx];idx+=1;text+='{'+nm+'}';params.append(f"{nm}:{v.strip()}")
        lead=len(text)-len(text.lstrip()); text=text.strip()
        n+=1
        return f"{open_tag}{{t('{text}',{{{','.join(params)}}})}}</Text>"
    out='';i=0
    while True:
        k=s.find('<Text',i)
        if k<0: out+=s[i:]; break
        if not re.match(r"<Text[\s>]",s[k:k+6]): out+=s[i:k+5]; i=k+5; continue
        depth=0;j=k;q=None
        while j<len(s):
            ch=s[j]
            if q:
                if ch=='\\': j+=2; continue
                if ch==q: q=None
            elif ch in "'\"`": q=ch
            elif ch=='{': depth+=1
            elif ch=='}': depth-=1
            elif ch=='>' and depth==0: break
            j+=1
        if s[j-1]=='/': out+=s[i:j+1]; i=j+1; continue
        end=s.find('</Text>',j)
        inner=s[j+1:end]
        class M: pass
        mm=M(); mm.group=lambda g,o=s[k:j+1],c=inner,full=s[k:end+7]: {0:full,1:o,2:c}[g]
        out+=s[i:k]+fix(mm); i=end+7
    s=out
    open(p,'w').write(s); print(p,n)
for p in sys.argv[1:]: run(p)
