#!/usr/bin/env python3
"""Persist the archive's actual content state on a date. Run automatically via GitHub Actions.
Needs PyYAML (installed in workflow); only archive source files, never manual homepage edits.
"""
import datetime, hashlib, json, math, os
from pathlib import Path
import yaml
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'src'/'data'
OUT=DATA/'murmurgrove-history'
OUT.mkdir(parents=True,exist_ok=True)

def items(section):
    result=[]
    for f in sorted((DATA/section).glob('*.md')):
        raw=f.read_text(encoding='utf-8-sig')
        if not raw.startswith('---'):continue
        try: meta=yaml.safe_load(raw.split('---',2)[1]) or {}
        except Exception:continue
        result.append((f.stem,meta))
    return result

def hashunit(text):
    h=2166136261
    for ch in text:
        for _ in [ch]:
            h ^= ord(ch)
            h=(h*16777619)&0xffffffff
    return h/4294967295

def mark(section,key,title,strength,related,recency):
    import urllib.parse
    seed=hashunit(f'{section}:{key}')
    angle=hashunit(f'angle:{section}:{key}')*2*math.pi
    radius=math.sqrt(hashunit(f'radius:{section}:{key}'))
    x=min(.92,max(.08,.5+math.cos(angle)*(.06+.37*radius)))
    y=min(.9,max(.1,.5+math.sin(angle)*(.05+.34*radius)))
    return {'key':key,'section':section,'title':str(title),'url':f'/{section}/{urllib.parse.quote(key)}/','strength':round(strength,5),'recency':round(recency,5),'related':related,'x':round(x,7),'y':round(y,7),'seed':round(seed,7)}

exhibitions=[(id,d) for id,d in items('exhibitions') if d.get('verification')!='draft']
people=items('people');institutions=items('institutions');concepts=items('concepts')
indexes={k:{i for i,_ in v} for k,v in [('people',people),('institutions',institutions),('concepts',concepts)]}
mentions={k:{} for k in indexes};recent={k:{} for k in indexes}
def timestamp(value):
    if isinstance(value,(datetime.date,datetime.datetime)):return value.toordinal()
    try:return datetime.date.fromisoformat(str(value)[:10]).toordinal()
    except:return 0
latest=max((timestamp(d.get('visitedOn')) for _,d in exhibitions),default=0)
relations=0
for id,d in exhibitions:
    linked={'institutions':[d.get('institution'),*(d.get('relatedInstitutions') or [])], 'people':d.get('artists') or [],'concepts':d.get('concepts') or []}
    for k,values in linked.items():
        for v in set(x for x in values if x in indexes[k]):
            mentions[k][v]=mentions[k].get(v,0)+1
            relations+=1
            if latest-timestamp(d.get('visitedOn'))<=75:recent[k][v]=recent[k].get(v,0)+1
marks=[]
for key,d in exhibitions:
    days=latest-timestamp(d.get('visitedOn'))
    n=len(d.get('artists') or [])+len(d.get('concepts') or [])+len(d.get('relatedInstitutions') or [])+(1 if d.get('institution') else 0)
    marks.append(mark('exhibitions',key,d.get('title',key),.36+min(1,n/7)*.64,n,max(0,min(1,1-days/110))))
for section,collection in [('institutions',institutions),('people',people),('concepts',concepts)]:
    for key,d in collection:
        n=mentions[section].get(key,0)
        marks.append(mark(section,key,d.get('title') or d.get('name') or key,.2+min(1,math.log1p(n)/2.6)*.8,n,min(1,recent[section].get(key,0)/2)))
marks.sort(key=lambda v:v['key'])
now=datetime.datetime.now(datetime.timezone.utc)
today=os.getenv('GROVE_SNAPSHOT_DATE') or now.date().isoformat()
captured_at=now.strftime('%Y-%m-%dT%H:%M:%SZ')
output={'capturedOn':today,'capturedAt':captured_at,'kind':'observed-build-snapshot','counts':{'exhibitions':len(exhibitions),'institutions':len(institutions),'people':len(people),'concepts':len(concepts)},'relationCount':relations,'relationDensity':round(relations/max(1,len(exhibitions)),5),'marks':marks}
content_signature=hashlib.sha256(json.dumps({'counts':output['counts'],'relationCount':relations,'marks':marks},ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:12]
output['signature']=content_signature
for existing in OUT.glob('*.json'):
    try:
        previous=json.loads(existing.read_text(encoding='utf-8'))
        if previous.get('signature')==content_signature:
            print(f'Unchanged archive, existing snapshot preserved: {existing.relative_to(ROOT)}')
            raise SystemExit(0)
    except (ValueError,OSError):pass
filename=f"{captured_at.replace(':','-')}-{content_signature}.json"
target=OUT/filename
target.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
print(f'Saved {len(marks)} marks: {target.relative_to(ROOT)}')
