"""Write the list of Portuguese keys that still have no English (numbered) to /tmp/miss.txt."""
import re,glob,json
keys=set()
for f in glob.glob('app/**/*.tsx',recursive=True)+glob.glob('src/**/*.tsx',recursive=True)+glob.glob('src/**/*.ts',recursive=True)+glob.glob('src/lib/*.cjs'):
    if f.endswith('i18n-en.cjs'): continue
    s=open(f).read()
    for m in re.finditer(r"(?<![\w.$])tr?\('((?:[^'\\]|\\.)*)'",s): keys.add(m.group(1).replace("\\'","'"))
consts={'app/edit-profile.tsx':['fields'],'app/tournaments/[communityId]/[id]/provas.tsx':['INPUT_HINT','PLACEHOLDER'],'app/tournaments/create.tsx':['FORMAT_LABELS','EVENT_LABELS','MODEL_HINTS'],'app/venues/[id]/suggest-edit.tsx':['FIELDS'],'app/venues/create.tsx':['TEXT_FIELDS'],'src/components/SportsTeamChallengesPanel.tsx':['label'],'src/components/TeamCrestStudio.tsx':['SYMBOLS','PATTERNS'],'src/components/TeamKitStudio.tsx':['PATTERNS','GARMENTS'],'app/tournaments/[communityId]/[id]/events.tsx':['ACTIONS']}
for f,names in consts.items():
    s=open(f).read()
    for n in names:
        m=re.search(r"^(?:export\s+)?const\s+"+re.escape(n)+r"\b[^\n]*(?:\n(?!const |function |export |type ).*)*",s,re.M)
        for mm in re.finditer(r"(?:label|placeholder|:)\s*'((?:[^'\\]|\\.)*)'",m.group(0)):
            v=mm.group(1)
            if re.search(r"[a-zà-ÿ]",v) and not re.fullmatch(r"[a-z_]+",v): keys.add(v)
s=open('app/venues/[id].tsx').read()
for m in re.finditer(r"(?:info|availability)\('([^']+)'",s): keys.add(m.group(1))
for f in ['src/lib/competition-core.cjs','src/lib/session-teams-presentation.cjs']:
    for m in re.finditer(r"return '([A-ZÀ-Ý][^']+)'",open(f).read()): keys.add(m.group(1))
s=open('src/lib/i18n-en.cjs').read()
m=re.search(r"const EN=\{\n(.*)\n\};",s,re.S); cur=json.loads("{"+m.group(1).rstrip(',\n')+"}")
miss=sorted(k for k in keys if k not in cur and k.strip() and k!='https://maps.app.goo.gl/…' and re.search(r"[a-zà-ÿ]{2}",k))
open('/tmp/miss.txt','w').write('\n'.join(f"{i}|{k}" for i,k in enumerate(miss)))
print(len(miss))
