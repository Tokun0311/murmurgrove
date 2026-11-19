#!/usr/bin/env python3
"""Snapshot the SAME morphology as the live page, not a second Python layout.

Requires PyYAML and Node >=22.19 (type stripping). Preserves content revisions
and a versioned history. Writes no simulated/future records.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import yaml

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'src'/'data'
OUT=DATA/'murmurgrove-history'
OUT.mkdir(parents=True,exist_ok=True)
model=json.loads((DATA/'murmurgrove-model.json').read_text(encoding='utf8'))
RENDER_FILES=[ROOT/'src/pages/index.astro', ROOT/'src/lib/murmurgrove.ts',ROOT/'src/content.config.ts',
  ROOT/'src/styles/global.css',ROOT/'scripts/record-murmurgrove-snapshot.py',
  ROOT/'scripts/murmurgrove-model-stdin.mjs',ROOT/'scripts/export-murmurgrove-history.mjs']
render_hash=hashlib.sha256(b''.join(f.read_bytes() for f in RENDER_FILES)).hexdigest()[:16]


def items(section):
    out=[]
    for path in sorted((DATA/section).glob('*.md')):
        content=path.read_text(encoding='utf-8-sig')
        if not content.startswith('---'):
            continue
        try:
            meta=yaml.safe_load(content.split('---',2)[1]) or {}
        except yaml.YAMLError:
            continue
        out.append({'id':path.stem,'data':meta})
    return out

names=('exhibitions','people','institutions','concepts','writing','photography')
input_data={k:items(k) for k in names}
# Archive uses "entries" while model input calls the same collection "writing".
result=subprocess.run(['node','--experimental-strip-types',str(ROOT/'scripts/murmurgrove-model-stdin.mjs')],
     input=json.dumps(input_data,ensure_ascii=False,default=str),capture_output=True,text=True,check=True)
organism=json.loads(result.stdout)

content_revisions={}
for section in names:
    for path in sorted((DATA/section).glob('*.md')):
        content_revisions[f'{section}:{path.stem}']=hashlib.sha256(path.read_bytes()).hexdigest()[:20]

previous_snapshots=[]
for file in OUT.glob('*.json'):
    try:previous_snapshots.append(json.loads(file.read_text(encoding='utf8')))
    except (OSError,ValueError):pass
previous_snapshots.sort(key=lambda d:d.get('capturedAt',d.get('capturedOn','')))
previous=previous_snapshots[-1] if previous_snapshots else None
before=(previous or {}).get('contentRevisions') or {}
changes={'new':sorted(set(content_revisions)-set(before)) if before else [],
 'edited':sorted(k for k in set(before)&set(content_revisions) if before[k]!=content_revisions[k]),
 'deleted':sorted(set(before)-set(content_revisions)) if before else [],
 'baselineUnavailable':bool(previous and not before)}
now=datetime.datetime.now(datetime.timezone.utc)
today=os.getenv('GROVE_SNAPSHOT_DATE') or now.date().isoformat()
captured_at=now.strftime('%Y-%m-%dT%H:%M:%SZ')
output={
 'capturedOn':today,'capturedAt':captured_at,'kind':'observed-build-snapshot',
 'morphologyVersion':model['version'],'modelVersion':model['version'],
 'motionSpeed':model['motionSpeed'],'motionTimebase':model['motionTimebase'],
 'releaseDate':model.get('releaseDate'),'renderSignature':render_hash,
 'historySchema':model['historySchema'],'contentRevisions':content_revisions,
 'changes':changes,'counts':organism['counts'],'relationCount':organism['relationCount'],
 'relationDensity':organism['relationDensity'],'fingerprint':organism['fingerprint'],
 'directionStates':organism['directionStates'],'marks':organism['marks'],'roots':organism['roots']}
signature=hashlib.sha256(json.dumps({'counts':output['counts'],'marks':output['marks'],
 'roots':output['roots'],'model':model,'renderSignature':render_hash,
 'contentRevisions':content_revisions},ensure_ascii=False,sort_keys=True).encode('utf8')).hexdigest()[:12]
output['signature']=signature
for file in OUT.glob('*.json'):
    try:
        old=json.loads(file.read_text(encoding='utf8'))
        if old.get('signature')==signature:
            print(f'No change: {file.name}')
            raise SystemExit(0)
    except (OSError,ValueError):pass
filename=f"{captured_at.replace(':','-')}-{signature}.json"
(OUT/filename).write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
print(f'Saved V6 snapshot: {len(organism["marks"])} records, {len(organism["roots"])} relations')
