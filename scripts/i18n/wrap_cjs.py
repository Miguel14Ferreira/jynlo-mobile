"""Wrap user-facing Portuguese in shared .cjs helpers with tr(). Scans each line
token by token (never inside another string), skips lines with regex literals."""
import re,sys
KEYS=r"(?:label|message|hint|title|error|description|reason|text|detail|warning|summary|caption|help|note)"
def is_sentence(v): return re.search(r"[A-ZÀ-Ýa-zà-ÿ]{3,} [a-zà-ÿ]",v) and not v.startswith(('http','/'))
def strings(line):
    i=0;out=[]
    while i<len(line):
        c=line[i]
        if c=='/' and line[i+1:i+2] in '/*': break
        if c in "'\"`":
            j=i+1
            while j<len(line) and line[j]!=c:
                j+=2 if line[j]=='\\' else 1
            out.append((i,j,c)); i=j+1; continue
        i+=1
    return out
def run(p):
    lines=open(p).read().split('\n'); n=0
    for k,line in enumerate(lines):
        if re.search(r"(^|[=(,:!&|?]\s*)/[^/*\s][^/\n]*/[gimsuy]*",line) or 'require(' in line: continue
        ctx_line=bool(re.search(r"\breturn\b|Error\(|\bthrow\b",line))
        res='';last=0
        for (a,b,q) in strings(line):
            if q!="'": continue
            v=line[a+1:b]
            pre=line[:a].rstrip()
            good=is_sentence(v) and "\\'" not in v and (
                re.search(r"Error\($",pre) or re.search(r"\breturn$",pre) or re.search(r"\b"+KEYS+r":$",pre) or
                (ctx_line and re.search(r"(\?|:|\|\|)$",pre) and not re.search(r"\b(case|default)\s*:$",pre)))
            if good and not re.search(r"\btr\($",pre):
                res+=line[last:a]+"tr('"+v+"')"; last=b+1; n+=1
        if last: lines[k]=res+line[last:]
    s='\n'.join(lines)
    if n and "require('./i18n-core.cjs')" not in s:
        s=s.replace("'use strict';","'use strict';\nconst {tr}=require('./i18n-core.cjs');",1) if s.startswith("'use strict';") else "const {tr}=require('./i18n-core.cjs');\n"+s
    if n: open(p,'w').write(s)
    print(p,n)
for p in sys.argv[1:]:
    if p.endswith(('i18n-core.cjs','i18n-en.cjs')): continue
    run(p)
