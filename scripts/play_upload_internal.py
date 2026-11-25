#!/usr/bin/env python3
"""Validate the existing Jynlo AAB and optionally upload it to the INTERNAL Google Play track."""
import argparse,hashlib,json,sys,zipfile
from pathlib import Path

PKG="com.jynlo.app"
TRACK="internal"

def validate(base,version,code,commit):
    aab=base/"android/app/build/outputs/bundle/release/app-release.aab"
    meta=base/"android-build-info.json"
    checksum=base/"android-build-sha256.txt"
    for f in (aab,meta,checksum):
        if not f.is_file() or f.stat().st_size==0: raise ValueError("Falta "+f.name)
    info=json.loads(meta.read_text())
    for k,v in {"format":"aab","packageName":PKG,"version":version,"versionCode":code,
                "gitCommit":commit,"distribution":"google-play-internal"}.items():
        if info.get(k)!=v: raise ValueError("Metadados não correspondem: "+k)
    if not str(info.get("apiUrl","")).startswith("https://"):
        raise ValueError("A API não está configurada para HTTPS")
    bits=checksum.read_text().strip().split()
    if len(bits)!=2 or bits[1]!="android/app/build/outputs/bundle/release/app-release.aab":
        raise ValueError("Checksum com nome de ficheiro inesperado")
    with aab.open("rb") as handle: digest=hashlib.file_digest(handle,"sha256").hexdigest()
    if digest!=bits[0].lower(): raise ValueError("Checksum SHA-256 incorreto")
    with zipfile.ZipFile(aab) as bundle:
        if "base/manifest/AndroidManifest.xml" not in bundle.namelist():
            raise ValueError("Manifesto Android AAB em falta")
    return aab,digest

def validate_plain(aab):
    if not aab.is_file() or aab.stat().st_size<1_000_000: raise ValueError("AAB em falta ou demasiado pequeno")
    with zipfile.ZipFile(aab) as bundle:
        if "base/manifest/AndroidManifest.xml" not in bundle.namelist():
            raise ValueError("Manifesto Android AAB em falta")
    with aab.open("rb") as handle: return hashlib.file_digest(handle,"sha256").hexdigest()

def send(aab,status,version,code,notes):
    import google.auth
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    import google_auth_httplib2,httplib2
    credential,_=google.auth.default(scopes=["https://www.googleapis.com/auth/androidpublisher"])
    raw=httplib2.Http(timeout=240)
    # Resumable uploads answer 308 "Resume Incomplete"; newer httplib2 treats it as a redirect.
    raw.redirect_codes=set(raw.redirect_codes)-{308}
    client=google_auth_httplib2.AuthorizedHttp(credential,http=raw)
    google=build("androidpublisher","v3",http=client,cache_discovery=False)
    edit=google.edits().insert(packageName=PKG,body={}).execute()
    edit_id=edit["id"]
    uploaded=google.edits().bundles().upload(packageName=PKG,editId=edit_id,
        media_body=MediaFileUpload(str(aab),mimetype="application/octet-stream",resumable=True)).execute()
    if int(uploaded.get("versionCode",-1))!=code: raise RuntimeError("versionCode inesperado")
    body={"track":TRACK,"releases":[{"name":"Jynlo Beta "+version+" - Teste Interno",
        "versionCodes":[str(code)],"status":status,
        "releaseNotes":[{"language":"pt-PT","text":notes}]}]}
    google.edits().tracks().update(packageName=PKG,editId=edit_id,track=TRACK,body=body).execute()
    google.edits().commit(packageName=PKG,editId=edit_id).execute()
    print("Google Play confirmou Jynlo "+version+" ("+str(code)+") na faixa interna com estado "+status)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--artifact-dir",type=Path,default=Path("play-artifact"))
    parser.add_argument("--apply",action="store_true")
    parser.add_argument("--status",choices=["draft","completed"],default="draft")
    parser.add_argument("--aab",type=Path,help="AAB gerado no EAS (sem metadados do GitHub)")
    parser.add_argument("--version",required=True)
    parser.add_argument("--version-code",type=int,required=True)
    parser.add_argument("--commit",default="")
    parser.add_argument("--notes",default="Melhorias e correções para os testadores.")
    args=parser.parse_args()
    if args.aab:
        aab,sha=args.aab,validate_plain(args.aab)
    else:
        if not args.commit: raise ValueError("--commit é obrigatório para AAB do GitHub")
        aab,sha=validate(args.artifact_dir,args.version,args.version_code,args.commit)
    print("AAB original validado: com.jynlo.app "+args.version+" / code "+str(args.version_code)+" / SHA-256 "+sha)
    if args.apply: send(aab,args.status,args.version,args.version_code,args.notes[:500])
    else: print("MODO SEM ENVIO: Google Play não foi alterada")

if __name__=="__main__":
    try: main()
    except Exception as e:
        print("ERRO Jynlo Play: "+type(e).__name__+": "+str(e),file=sys.stderr)
        sys.exit(1)
