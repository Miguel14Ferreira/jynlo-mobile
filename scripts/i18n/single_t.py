"""Second pass: single words in safe UI contexts (alert titles/buttons, JSX ternaries)."""
import re,sys,json
SPORTS=set(json.load(open('/tmp/sports.json'))) if len(sys.argv)>1 and sys.argv[1]=='--sports' else set()
WORD=r"[A-ZÀ-Ý][a-zà-ÿ]+(?:-[a-zà-ÿ]+)?"
def run(path,sports):
    s=open(path).read(); o=s
    s=re.sub(r"\btext:'("+WORD+r")'",lambda m:m.group(0) if m.group(1) in sports else "text:t('"+m.group(1)+"')",s)
    s=re.sub(r"Alert\.alert\('((?:[^'\\]|\\.)*)'",lambda m:"Alert.alert(t('"+m.group(1)+"')",s)
    out=[]
    for line in s.split('\n'):
        if '<' in line and '>' in line and not line.lstrip().startswith(('import','//')):
            line=re.sub(r"([?:])'("+WORD+r")'(?=\s*[:})\]])",lambda m:m.group(0) if m.group(2) in sports else m.group(1)+"t('"+m.group(2)+"')",line)
        out.append(line)
    s='\n'.join(out)
    if s!=o: open(path,'w').write(s)
sports=set(l.strip().strip("',") for l in open('src/lib/sports.ts').read().replace("\n",",").split(",") if l.strip().startswith("'"))
for p in sys.argv[1:]: run(p,sports)
