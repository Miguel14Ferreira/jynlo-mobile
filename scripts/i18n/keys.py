import re,glob,json,sys
keys=set()
for f in glob.glob('app/**/*.tsx',recursive=True)+glob.glob('src/**/*.tsx',recursive=True)+glob.glob('src/**/*.ts',recursive=True):
    s=open(f).read()
    for m in re.finditer(r"\btr?\('((?:[^'\\]|\\.)*)'",s): keys.add(m.group(1).replace("\\'","'"))
json.dump(sorted(keys),sys.stdout,ensure_ascii=False,indent=0)
