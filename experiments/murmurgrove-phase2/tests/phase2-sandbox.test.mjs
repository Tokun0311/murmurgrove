import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {buildThreeSnapshots} from '../src/build-snapshots.mjs';
import {deriveGeometry,validateRenderSnapshot,sha256Canonical,verifyScene} from '../public/adapter.mjs';
import {ribbonVertices,STRIDE_FLOATS} from '../public/geometry.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const baseline=JSON.parse(readFileSync(resolve(ROOT,'../murmurgrove-phase1b/baseline/known-data-baseline.v1.json'),'utf8'));
const load=x=>JSON.parse(readFileSync(resolve(ROOT,'public/data',x+'.json'),'utf8'));
const frozenFiles=['T0','T1','T2'].map(load),manifest=load('manifest');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const originalBaselineBytes=readFileSync(resolve(ROOT,'../murmurgrove-phase1b/baseline/known-data-baseline.v1.json'));
const lifePath=resolve(ROOT,'../murmurgrove-phase1b/events/life-events.ndjson');
const linkPath=resolve(ROOT,'../murmurgrove-phase1b/events/author-asserted-links.ndjson');
const logs=[hash(readFileSync(lifePath)),hash(readFileSync(linkPath))];

test('real source remains frozen at exact pinned baseline',()=>{
 assert.equal(baseline.baselineProjectionHash,'62372e469ead425dd43fc16e737ea40cd48ce5a0188a87b868d1bee62c8ba9d3');
 assert.equal(baseline.counts.includedRecords,181);assert.equal(baseline.counts.quarantinedRecords,7);
 assert.equal(baseline.counts.ordinaryReferenceOnly,158);
});
test('T0 T1 T2 are generated from ONE event timeline with identical hash pins',()=>{
 const generated=buildThreeSnapshots(baseline);
 assert.deepEqual(generated.manifest,manifest);assert.deepEqual(generated.scenes,frozenFiles);
 assert.equal(generated.manifest.timeline,'ONE_SIMULATED_CONTINUOUS_HISTORY');
});
test('T0 has no false life',()=>{assert.equal(frozenFiles[0].nodes.length,174);assert.equal(frozenFiles[0].fibers.length,0);
 assert.equal(frozenFiles[0].pulseChambers.length,0);assert.equal(frozenFiles[0].propulsionCores.length,0);});
test('T1 has exactly 12 activated fibers, 7 transient pulses, zero mature cores',()=>{
 assert.equal(frozenFiles[1].fibers.length,12);assert.equal(frozenFiles[1].pulseChambers.length,7);assert.equal(frozenFiles[1].propulsionCores.length,0);
 assert.equal(frozenFiles[1].counts.simulatedLifeEvents,12);
});
test('T2 is same continuous timeline with 13-day Writing maturity',()=>{
 assert.equal(frozenFiles[2].nodes.length,175);assert.equal(frozenFiles[2].fibers.length,15);
 assert.equal(frozenFiles[2].propulsionCores.length,2);assert.equal(frozenFiles[2].counts.simulatedLifeEvents,13);
 assert.ok(Date.parse(frozenFiles[2].asOf)>Date.parse(frozenFiles[1].asOf));
});
test('all scene hashes verified independently',async()=>{
 for(const s of frozenFiles){assert.equal(await verifyScene(s,manifest),true);
  const {snapshotHash,...body}=s;assert.equal(await sha256Canonical(body),snapshotHash);}
});
test('manifest hash independently verified',async()=>{const {manifestHash,...body}=manifest;assert.equal(await sha256Canonical(body),manifestHash);});
test('corrupt snapshot fails closed',async()=>{
 const corrupt=structuredClone(frozenFiles[2]);corrupt.nodes[0].position[0]+=0.01;
 await assert.rejects(verifyScene(corrupt,manifest),/SHA-256/);
});
test('forged fiber topology is rejected',()=>{
 const corrupt=structuredClone(frozenFiles[1]);corrupt.fibers[0].from='concept:invented';
 assert.throws(()=>validateRenderSnapshot(corrupt),/Invented/);
});
test('geometry adapter is read-only and does not invent connections',()=>{
 for(const s of frozenFiles){const before=JSON.stringify(s);
  for(const variant of ['A','B','C']){
   const d=deriveGeometry(s,variant);assert.equal(d.snapshotHash,s.snapshotHash);
   assert.equal(d.sourceCounts.fibers,s.fibers.length);
   const allowed=new Set([...s.nodes.map(n=>n.id),...s.fibers.map(f=>f.id),...s.branches.map(b=>b.id)]);
   for(const strand of d.strands){assert.ok(strand.positions.every(p=>p.every(Number.isFinite)));
    if(strand.role==='fiber' && !strand.sourceId.startsWith('branch:') && !strand.sourceId.includes(':fossil:'))assert.ok(allowed.has(strand.sourceId));}
   assert.ok(d.strands.length>0);
  }assert.equal(JSON.stringify(s),before);
 }
});
test('geometry is deterministic and variant-dependent only in derived render layers',()=>{
 const s=frozenFiles[2],a=deriveGeometry(s,'A'),b=deriveGeometry(s,'B'),c=deriveGeometry(s,'C');
 assert.deepEqual(a,deriveGeometry(s,'A'));assert.notEqual(a.strands.length,b.strands.length);
 assert.notEqual(b.strands.length,c.strands.length);assert.equal(a.snapshotHash,b.snapshotHash);
});
test('all strand triangles have finite values and no native GL_LINES',()=>{
 for(const s of frozenFiles)for(const variant of ['A','B','C']){
  const g=deriveGeometry(s,variant);for(const strand of g.strands){const v=ribbonVertices(strand);
   assert.equal(v.length%STRIDE_FLOATS,0);assert.equal((v.length/STRIDE_FLOATS)%3,0);
   assert.ok(v.every(Number.isFinite));}
 }
});
test('unactivated records never acquire physiological lignification',()=>{
 for(const s of frozenFiles)for(const n of s.nodes)if(!n.activeEver)assert.equal(n.lignification,0);
});
test('no simulated event has been persisted to the author logs',()=>{
 assert.equal(hash(readFileSync(lifePath)),logs[0]);assert.equal(hash(readFileSync(linkPath)),logs[1]);
 assert.equal(hash(readFileSync(resolve(ROOT,'../murmurgrove-phase1b/baseline/known-data-baseline.v1.json'))),hash(originalBaselineBytes));
});
test('all T0 T1 T2 samples preserve the same baseline and audit',()=>{
 for(const s of frozenFiles){assert.equal(s.provenance.baselineProjectionHash,manifest.baselineProjectionHash);
  assert.equal(s.provenance.auditProjectionHash,manifest.auditProjectionHash);assert.equal(s.mode,'SIMULATED_SANDBOX');}
});
test('near view min-width screen-space clamp and ordered alpha paths are present',()=>{
 const source=readFileSync(resolve(ROOT,'public/renderer-webgl2.mjs'),'utf8');
 assert.match(source,/max\(1\.35,worldPixels\)/);assert.match(source,/gl\.TRIANGLES/);
 assert.match(source,/\.sort\(/);assert.match(source,/depthMask\(false\)/);
 assert.doesNotMatch(source,/gl\.LINES/);
});
test('three.js optional adapter exists but is not mislabeled as locally bundled',()=>{
 const source=readFileSync(resolve(ROOT,'public/renderer-three.mjs'),'utf8');
 assert.match(source,/three@0\.180\.0/);assert.match(source,/WebGLRenderer/);
 assert.match(source,/depthWrite:false/);
});
test('snapshot writer rejects any output path outside the Phase 2.0 sandbox',async()=>{
 const {emitSnapshots}=await import('../src/build-snapshots.mjs');
 assert.throws(()=>emitSnapshots({outputDir:resolve(ROOT,'../murmurgrove-phase1b/events')}),/restricted/);
});
test('ordered alpha slabs reduce GPU draw submissions without changing source geometry',async()=>{
 const {renderBatches}=await import('../public/geometry.mjs');
 for(const s of frozenFiles)for(const variant of ['A','B','C']){
  const derived=deriveGeometry(s,variant),batches=renderBatches(derived);
  assert.ok(batches.length<derived.strands.length/2);
  const rawCount=derived.strands.reduce((n,x)=>n+ribbonVertices(x).length,0);
  assert.equal(batches.reduce((n,b)=>n+b.vertices.length,0),rawCount);
  assert.ok(batches.every(b=>b.vertices.every(Number.isFinite)));
 }
});
