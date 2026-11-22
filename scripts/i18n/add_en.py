"""Merge numbered English lines ("i|English") for /tmp/miss.txt into src/lib/i18n-en.cjs."""
import re,json,sys
pt={int(l.split('|',1)[0]):l.split('|',1)[1] for l in open('/tmp/miss.txt').read().split('\n') if l}
add={}
for l in open(sys.argv[1]).read().split('\n'):
    if not l.strip(): continue
    i,en=l.split('|',1); i=int(i); k=pt[i]
    ph=lambda x:sorted(re.findall(r"\{(\w+)\}",x))
    if ph(k)!=ph(en): print('PLACEHOLDER MISMATCH',i,k,'=>',en); continue
    add[k]=en
p='src/lib/i18n-en.cjs'; s=open(p).read()
m=re.search(r"const EN=\{\n(.*)\n\};",s,re.S); cur=json.loads("{"+m.group(1).rstrip(',\n')+"}")
for k,v in add.items(): cur.setdefault(k,v)
body=''.join("  "+json.dumps(k,ensure_ascii=False)+": "+json.dumps(cur[k],ensure_ascii=False)+",\n" for k in sorted(cur))
open(p,'w').write(s[:m.start()]+"const EN={\n"+body+"};"+s[m.end():])
print('added',len(add))
