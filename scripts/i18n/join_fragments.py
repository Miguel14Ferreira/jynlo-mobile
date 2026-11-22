"""t('Texto ')+expr  ->  t('Texto {v}',{v:expr})   (expr read with bracket balance)."""
import re,sys
def expr_end(s,i):
    depth=0;q=None;j=i
    while j<len(s):
        c=s[j]
        if q:
            if c=='\\': j+=2; continue
            if c==q: q=None
        elif c in "'\"`": q=c
        elif c in '([{': depth+=1
        elif c in ')]}':
            if depth==0: return j
            depth-=1
        elif depth==0 and (c in ',;?:' or s.startswith('+',j) or s.startswith('&&',j) or s.startswith('||',j)): return j
        j+=1
    return j
def run(p):
    s=open(p).read(); n=0
    pat=re.compile(r"t\('((?:[^'\\]|\\.)*?(?:: | de | com | da | do | na | no | |@))'\)\+")
    while True:
        m=pat.search(s)
        if not m: break
        start=m.end(); end=expr_end(s,start)
        e=s[start:end].strip()
        if not e: break
        text=m.group(1)
        s=s[:m.start()]+"t('"+text+"{v}',{v:"+e+"})"+s[end:]; n+=1
    open(p,'w').write(s); print(p,n)
for p in sys.argv[1:]: run(p)
