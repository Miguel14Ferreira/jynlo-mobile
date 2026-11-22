import re,sys
for f in sys.argv[1:]:
    for i,line in enumerate(open(f),1):
        if line.lstrip().startswith(('import','//')) or 'StyleSheet' in line: continue
        for m in re.finditer(r"(?<![\w.$\]`])'((?:[^'\\\n]|\\.)*)'",line):
            v=m.group(1); pre=line[:m.start()]
            if pre.endswith('t('): continue
            if not re.search(r"[a-zà-ÿ]",v) or re.fullmatch(r"[a-z0-9_\-./:\[\]()]+",v) or v.startswith(('/','http','#')): continue
            print(f"{f}:{i}: {v}")
        for m in re.finditer(r">([^<>{}()=;&|]*[A-Za-zÀ-ÿ][^<>{}()=;&|]*)</",line):
            if m.group(1).strip(): print(f"{f}:{i}: JSX {m.group(1).strip()}")
