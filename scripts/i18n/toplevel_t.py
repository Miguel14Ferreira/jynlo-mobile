import re,sys
# t( called while brace depth is 0 relative to function bodies = evaluated at import time
for f in sys.argv[1:]:
    s=open(f).read(); depth=0; infunc=[]; i=0
    # crude: track whether we're inside any 'function' or '=>' body using braces after them
    stack=[]; tok=re.finditer(r"function\b|=>\s*\{|=>|\{|\}|\bt\('",s)
    for m in tok:
        x=m.group(0)
        if x.startswith('function'): pending='f'; stack.append('pf')
        elif x.startswith('=>') and x.endswith('{'): stack.append('F')
        elif x=='=>': pass
        elif x=='{':
            if stack and stack[-1]=='pf': stack[-1]='F'
            else: stack.append('o')
        elif x=='}':
            if stack: stack.pop()
        elif x=="t('":
            if 'F' not in stack:
                line=s.count('\n',0,m.start())+1
                # arrow expressions without braces: check same line for '=>' before
                ln=s.split('\n')[line-1]
                if '=>' in ln[:ln.find("t('")]: continue
                print(f"{f}:{line}: {ln.strip()[:120]}")
