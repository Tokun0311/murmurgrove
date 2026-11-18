#!/usr/bin/env python3
"""Read actual archive Markdown and output graph diagnostics, no audio invented."""
from collections import Counter
from pathlib import Path
import json, yaml
BASE=Path(__file__).resolve().parents[1]/'src'/'data'
def items(category):
    result={}
    for file in (BASE/category).glob('*.md'):
        body=file.read_text(encoding='utf-8')
        if not body.startswith('---\n'):continue
        fm=yaml.safe_load(body.split('---',2)[1]) or {}
        result[file.stem]=fm
    return result
ex=items('exhibitions'); valid={k:set(items(k)) for k in ('people','institutions','concepts')}
roots=[];shared=Counter()
for slug,d in ex.items():
    if d.get('verification')=='draft':continue
    found={
        'institutions':list(dict.fromkeys([x for x in ([d.get('institution')]+(d.get('relatedInstitutions') or [])) if isinstance(x,str) and x in valid['institutions']])),
        'people':list(dict.fromkeys([x for x in (d.get('artists') or []) if x in valid['people']])),
        'concepts':list(dict.fromkeys([x for x in (d.get('concepts') or []) if x in valid['concepts']]))
    }
    nodes=[]
    for cat,ids in found.items():
        for id in ids:
            key=f'{cat}:{id}'
            roots.append(dict(from_=f'exhibitions:{slug}',to=key,weight=1,kind='direct'))
            nodes.append(key)
    for i,a in enumerate(nodes):
        for b in nodes[i+1:]:
            if a.split(':')[0]!=b.split(':')[0]:shared[tuple(sorted((a,b)))]+=1
for (a,b),w in shared.items():
    if w>=2:roots.append(dict(from_=a,to=b,weight=w,kind='shared'))
raw=[{'from':e['from_'],'to':e['to'],'weight':e['weight'],'kind':e['kind']} for e in roots]
print(json.dumps({'records_by_section':{'exhibitions':len(ex),**{k:len(v) for k,v in valid.items()}},'roots':len(raw),'direct':sum(x['kind']=='direct' for x in raw),'reinforced':sum(x['kind']=='shared' for x in raw),'edges':raw},ensure_ascii=False))
