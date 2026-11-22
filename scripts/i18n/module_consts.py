"""List module-level const/let statements that call t()/tr() (evaluated once, at import)."""
import re,sys
for f in sys.argv[1:]:
    s=open(f).read(); i=0
    for m in re.finditer(r"^(?:export\s+)?(?:const|let)\s+\w+[^=\n]*=",s,re.M):
        j=m.end();depth=0;q=None
        while j<len(s):
            c=s[j]
            if q:
                if c=='\\': j+=2; continue
                if c==q: q=None
            elif c in "'\"`": q=c
            elif c in '([{': depth+=1
            elif c in ')]}': depth-=1
            elif c==';' and depth<=0: break
            elif c=='\n' and depth<=0 and not s[j+1:j+2].isspace() and s[j-1] not in ',(=>[{+?:': break
            j+=1
        stmt=s[m.start():j]
        # arrow functions/components are fine: t() runs at call time
        head=stmt[:stmt.find('=')+1+40]
        if re.search(r"=\s*(\([^)]*\)|\w+)\s*(:\s*[^=]+)?=>|=\s*(async\s+)?function|=\s*(React\.)?(memo|forwardRef|lazy)\(",head): continue
        if re.search(r"(?<![\w.])tr?\('",stmt): print(f"{f}:{s.count(chr(10),0,m.start())+1}: {stmt[:100].strip()}")
