import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {canonicalJSON} from '../public/version-chronicle.mjs';
import {makeLivedDraft} from '../public/lived-events.mjs';
import {verifyLifeStateIndex,verifyLifeCapture,LIFE_CAPTURE_CLAIM,LIFE_CAPTURE_INDEX} from '../public/life-checkpoints.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=x=>createHash('sha256').update(x).digest('hex');
const fresh=async()=>{
 const folder=await mkdtemp(join(tmpdir(),'murmurgrove-life-states-'));
 const files=['scripts/import-lived-event.mjs','scripts/capture-life-state.mjs','public/lived-events.mjs',
 'public/version-chronicle.mjs','public/withdrawals.mjs','public/quiet-particles.mjs','public/life-morphology.mjs','public/life-checkpoints.mjs',
 'public/data/lived-events/index.json','public/data/withdrawals/index.json','public/data/life-states/index.json','public/data/chronicle/index.json',
 'public/data/known-data-baseline.v1.json','public/data/navigation.json','public/data/T0.json'];
 for(const f of files){await mkdir(dirname(join(folder,f)),{recursive:true});await copyFile(join(root,f),join(folder,f));}
 return folder;
};
const run=(dir,script,args=[])=>spawnSync(process.execPath,[join(dir,script),...args],{encoding:'utf8',timeout:20000});
const read=(dir,path)=>readFile(join(dir,'public',path),'utf8');
test('release starts with zero derived-state captures; no synthetic first act is inserted',async()=>{
 const index=JSON.parse(await readFile(join(root,'public/data/life-states/index.json'),'utf8'));
 assert.equal(index.schema,LIFE_CAPTURE_INDEX);assert.deepEqual(index.entries,[]);
 await verifyLifeStateIndex(index,async v=>sha(v));
 const result=run(root,'scripts/capture-life-state.mjs');assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/No authored life events/);
});
test('approved event → deterministic state capture → indexed checksum → replay, in a disposable copy only',async()=>{
 const tmp=await fresh();
 const first=JSON.parse(await read(tmp,'data/chronicle/index.json')) .entries[0];
 const nav=JSON.parse(await read(tmp,'data/navigation.json'));const record=nav.records.find(r=>!r.quarantined&&r.path);
 const d=makeLivedDraft({recordId:record.id,kind:'life.reinterpretation',note:'I personally revisited this record and changed my reading of its institutional context.',
  evidenceUrl:'',recordedAt:new Date().toISOString(),nonce:'f'.repeat(32),
  baselineProjectionHash:first.baselineProjectionHash,archiveSourceEntryHash:first.entryHash});
 const draft=join(tmp,'approved.json');await writeFile(draft,JSON.stringify(d));
 const imported=run(tmp,'scripts/import-lived-event.mjs',['--file',draft,'--author-approved']);
 assert.equal(imported.status,0,imported.stderr);assert.match(imported.stdout,/Sealed manually attested event/);
 const stored=run(tmp,'scripts/capture-life-state.mjs');assert.equal(stored.status,0,stored.stderr);
 assert.match(stored.stdout,/Captured deterministic life rule state/);
 const index=JSON.parse(await read(tmp,'data/life-states/index.json'));
 assert.equal(index.entries.length,1);await verifyLifeStateIndex(index,async v=>sha(v));
 const entry=index.entries[0],raw=await read(tmp,entry.file),payload=JSON.parse(raw);
 assert.equal(sha(raw),entry.rawSha256);assert.equal(payload.claim,LIFE_CAPTURE_CLAIM);
 assert.equal(payload.authoredEvents,1);assert.equal(payload.state.authoredEventsUsed,1);
 assert.equal(payload.state.sourceNodeCount,174);assert.equal(payload.state.sourceLinkCount,158);
 assert.equal(payload.state.activatedFibers,0);assert.equal(payload.state.matureCores,0);
 assert.equal(payload.state.sedimentaryRecords,1);
 assert.equal(await verifyLifeCapture(payload,async v=>sha(v),{entry,knownEventHeads:new Set([entry.sourceEventHead])}),true);
 const repeat=run(tmp,'scripts/capture-life-state.mjs');assert.equal(repeat.status,0,repeat.stderr);
 assert.match(repeat.stdout,/No duplicate created/);
 assert.equal(JSON.parse(await read(tmp,'data/life-states/index.json')).entries.length,1);
 const spoiled={...payload,capturedAt:'2025-01-01T00:00:00.000Z'};
 await assert.rejects(verifyLifeCapture(spoiled,async v=>sha(v),{entry}),/state|modified|mismatch/i);
 await writeFile(join(tmp,'public',entry.file),raw+' ');
 const reject=run(tmp,'scripts/capture-life-state.mjs');assert.notEqual(reject.status,0);
 assert.match(reject.stderr,/Existing rule state was modified/);
});
test('older nonzero authored-event optical frames retain provenance instead of falsely claiming zero',async()=>{
 const {opticalFramePayload,validateFrameShape}=await import('../public/optical-frames.mjs');
 const asOf=new Date().toISOString();
 const t0=JSON.parse(await readFile(join(root,'public/data/T0.json'),'utf8'));
 const frame=opticalFramePayload({png:'data:image/png;base64,AAAA',recordedAt:asOf,frameRenderedAt:asOf,
  camera:{mode:'Whole',angle:0,elevation:0,zoom:1,pan:[0,0]},cssViewport:[100,100],pixelViewport:[100,100],
  screenNodes:t0.nodes.map(n=>[n.id,1,1]),rendererSha256:'a'.repeat(64),archiveSourceEntryHash:'b'.repeat(64),
  opticalGeometrySha256:'c'.repeat(64),authoredEventCount:2,lifeLedgerIndexHash:'d'.repeat(64)});
 frame.pngSha256='e'.repeat(64);frame.exportHash='f'.repeat(64);
 assert.equal(frame.approvedLifeEvents,2);assert.equal(frame.lifeLedgerIndexHash,'d'.repeat(64));
 assert.equal(validateFrameShape(frame),true);
 assert.throws(()=>validateFrameShape({...frame,lifeLedgerIndexHash:null}),/ledger provenance/i);
});
