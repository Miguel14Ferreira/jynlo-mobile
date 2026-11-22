import re,sys,json
PT=re.compile(r"[a-zà-ÿ]",re.I)
def esc(s): return s.replace("\\","\\\\").replace("'","\\'")
def is_ui(s):
    s2=s.strip()
    if len(s2)<2 or not PT.search(s2): return False
    if s2.startswith(('/','http','#','./','../','@','api')): return False
    if re.fullmatch(r"[A-Z0-9_\-.]+",s2): return False  # ENUMS
    if re.fullmatch(r"[a-z0-9_\-.:\[\]]+",s2): return False  # ids/keys
    if ' ' not in s2 and not re.search(r"[…?!.:]$",s2): return False  # single words: manual
    return True
found=[]
def run(path):
    s=open(path).read(); o=s
    # attributes
    def attr(m):
        v=m.group(2)
        if not is_ui(v) and not (m.group(1) in('accessibilityLabel','placeholder','title','subtitle') and PT.search(v)): return m.group(0)
        found.append(v); return f"{m.group(1)}={{t('{esc(v)}')}}"
    s=re.sub(r'\b(title|placeholder|accessibilityLabel|subtitle|label|caption|hint|accessibilityHint)="([^"{}]+)"',attr,s)
    # JSX text
    def txt(m):
        v=m.group(1)
        core=v.strip()
        if not core or not PT.search(core) or core.startswith('//'): return m.group(0)
        if (' ' not in core and re.search(r'[?:.]',core)) or core[0] in ':?' or '&&' in core or '||' in core: return m.group(0)
        if re.fullmatch(r"[A-Z0-9 ·•\-]+",core) and len(core)<3: return m.group(0)
        found.append(core)
        lead=v[:len(v)-len(v.lstrip())]; trail=v[len(v.rstrip()):]
        return ">"+lead+"{t('"+esc(core)+"')}"+trail+"<"
    s=re.sub(r"(?<=[\"'}\w/])>([^<>{}()=;&|]*[A-Za-zÀ-ÿ][^<>{}()=;&|]*)(?=</?[A-Za-z])",lambda m: txt(m)[:-1] if txt(m).endswith('<') else txt(m),s)
    # single-quoted literals (not imports, not already t()) 
    lines=s.split('\n'); out=[]
    for line in lines:
        if line.lstrip().startswith(('import ','//','*','/*')) or 'require(' in line or 'StyleSheet' in line:
            out.append(line); continue
        def lit(m):
            pre=line[:m.start()]
            v=m.group(1)
            if pre.rstrip().endswith(('t(','==','===','!==','!=','case')) : return m.group(0)
            if re.search(r"(pathname|href|name|key|icon|tone|kind|testID|nativeID|style|router\.(push|replace))\s*[:=(]\s*$",pre): return m.group(0)
            if not is_ui(v): return m.group(0)
            if "\\'" in v: return m.group(0)
            found.append(v); return "t('"+v+"')"
        line=re.sub(r"(?<![\w.$\]`])'((?:[^'\\\n]|\\.)*)'",lit,line)
        out.append(line)
    s='\n'.join(out)
    if s!=o:
        if "from '../src/lib/i18n'" not in s and "lib/i18n'" not in s:
            depth=path.count('/')
            rel='../'*depth+'src/lib/i18n' if path.startswith('app/') else None
            if path.startswith('src/components/') or path.startswith('src/features/'): rel='../lib/i18n'
            s=re.sub(r"^(import [^\n]*\n)",r"\1import {t} from '"+rel+"';\n",s,count=1)
        open(path,'w').write(s)
for p in sys.argv[1:]: run(p)
json.dump(sorted(set(found)),open('/tmp/found.json','w'),ensure_ascii=False,indent=0)
print(len(set(found)),'strings')
