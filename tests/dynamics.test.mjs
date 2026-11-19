import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {seedPoint,simulateMorphology,directionField,metrics,microSignal,MODEL_VERSION}
 from '../src/dynamics.mjs';
import {fingerprint,replay} from '../src/protocol.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/synthetic-events.json',import.meta.url),'utf8'));
const at=s=>simulateMorphology(fixture,{asOf:s});
const T={old:'2027-12-31T23:59:59Z',new:'2030-01-11T00:00:00Z',
  dormant:'2036-07-20T11:01:59Z',awake:'2036-07-21T00:00:00Z',corrected:'2037-03-02T08:00:00Z'};
const item=(a,id)=>a.find(e=>e.id===id);
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const bend=(f)=>distance(f.points[2],f.points[0].map((v,i)=>(v+f.points[4][i])/2));

test('Phase 1B model version and Phase 1A replay unchanged',()=>{
  assert.equal(MODEL_VERSION,'murmurgrove.dynamics.1b.0');
  assert.equal(replay(fixture,{asOf:T.old}).records.length,1);
});
test('SHA-256 seeds stable, in [-1,1]^3, distinct for separate stable IDs',()=>{
  const a=seedPoint('concept:site-specificity'),b=seedPoint('writing:sample-2036');
  assert.deepEqual(a,seedPoint('concept:site-specificity'));
  assert.equal(a.length,3);
  assert.ok(a.every(n=>Number.isFinite(n)&&n>=-1&&n<=1));
  assert.notDeepEqual(a,b);
});
test('historical 2027 lived morphology contains no later exhibition, fiber or event',()=>{
  const s=at(T.old);
  assert.equal(s.nodes.length,1);assert.equal(s.fibers.length,0);
  assert.equal(s.lifeCount,0);
  assert.equal(item(s.nodes,'exhibition:sample-2027'),undefined);
});
test('asOf predating the earliest event yields empty morphology',()=>{
  assert.equal(at('2026-01-01T00:00:00Z').nodes.length,0);
});
test('archive-only link assertion cannot produce an active fiber',()=>{
  const s=at('2030-01-10T10:01:30Z');
  assert.equal(s.nodes.length,2);
  assert.equal(s.fibers.length,0);assert.equal(s.lifeCount,0);
});
test('life.encounter explicitly activating real link develops positive tension',()=>{
  const s=at(T.new),f=item(s.fibers,'link:exhibition-site');
  assert.ok(f.tension>0);assert.ok(f.activity>0);
  assert.equal(s.fibers.length,1);assert.equal(s.lifeCount,1);
});
test('physical spring changes endpoints and path bends in a nonstraight manner',()=>{
  const s=at(T.new),f=s.fibers[0],concept=item(s.nodes,'concept:site-specificity');
  assert.ok(distance(concept.seed,concept.position)>0.0001);
  assert.ok(bend(f)>0.01);
  assert.equal(f.points.length,5);
});
test('direction fields exist only after concepts receive real activation',()=>{
  const p=[0,0,0],quiet=at(T.old),active=at(T.new);
  assert.deepEqual(directionField(p,{nodes:new Map(quiet.nodes.map(n=>[n.id,n]))}),[0,0,0]);
  const v=directionField(p,{nodes:new Map(active.nodes.map(n=>[n.id,n]))});
  assert.ok(Math.hypot(...v)>0);
});
test('years without events lower activity and accumulate lignification',()=>{
  const live=at(T.new),old=at(T.dormant);
  const a=item(live.fibers,'link:exhibition-site'),b=item(old.fibers,'link:exhibition-site');
  assert.ok(b.activity<a.activity);
  assert.ok(b.lignification>.85);
  assert.ok(b.tension<a.tension);
  assert.equal(old.lifeCount,1);
});
test('dormant fibers retain spatial coordinates when there are no life events',()=>{
  const a=item(at(T.new).fibers,'link:exhibition-site');
  const b=item(at(T.dormant).fibers,'link:exhibition-site');
  assert.deepEqual(b.points,a.points);
});
test('new writing assertion by itself is not a new life event',()=>{
  const before=at('2036-07-20T10:59:59Z');
  const after=at('2036-07-20T11:01:59Z');
  assert.equal(after.lifeCount,before.lifeCount);
  assert.equal(after.fibers.length,before.fibers.length);
  assert.equal(item(after.nodes,'writing:sample-2036').activity,0);
});
test('2036 reinterpretation grows new branch from existing fossil, never from an invented link',()=>{
  const s=at(T.awake),f=item(s.fibers,'link:exhibition-site'),fresh=item(s.fibers,'link:writing-site');
  assert.equal(s.branches.length,1);assert.ok(fresh.tension>0);
  assert.equal(s.branches[0].fromFiber,f.id);
  assert.equal(s.branches[0].toRecord,'writing:sample-2036');
  assert.equal(s.branches[0].causedBy,'evt:reinterpretation-2036');
  assert.ok(s.branches[0].angleDegrees>0);
  assert.equal(f.fossilLayers.length,1);
  assert.ok(f.scarFactor>=.35);
  assert.ok(item(s.nodes,'concept:site-specificity').sedimentLayers>=1);
});
test('fossil snapshot geometry is exact old pre-reinterpretation path',()=>{
  const before=item(at(T.dormant).fibers,'link:exhibition-site');
  const after=item(at('2036-07-20T11:02:00Z').fibers,'link:exhibition-site');
  assert.deepEqual(after.fossilLayers[0].points,before.points);
});
test('old concept never resets to original seed or loses its material age',()=>{
  const before=item(at(T.dormant).nodes,'concept:site-specificity');
  const after=item(at(T.awake).nodes,'concept:site-specificity');
  assert.ok(after.lignification>=before.lignification);
  assert.ok(after.scarFactor>before.scarFactor);
  assert.ok(after.activity>before.activity);
  assert.ok(after.sedimentAnchors.length>before.sedimentAnchors.length);
  assert.ok(distance(after.position,after.seed)>0.0001);
});
test('later metadata correction does not forge a life event or morphological change',()=>{
  const full=at(T.corrected);
  const withoutCorrection=simulateMorphology(fixture.slice(0,7),{asOf:T.corrected});
  assert.equal(full.lifeCount,withoutCorrection.lifeCount);
  assert.equal(full.morphologyHash,withoutCorrection.morphologyHash);
  assert.equal(replay(fixture).records.find(r=>r.kind==='exhibition').occurredOn,'2027-06-11');
});
test('out-of-order input and exact duplicate deliveries yield identical morphology hash',()=>{
  const base=at(T.awake);
  const reverse=simulateMorphology([...fixture].reverse(),{asOf:T.awake});
  const duplicates=simulateMorphology([...fixture,structuredClone(fixture[1])],{asOf:T.awake});
  assert.equal(base.morphologyHash,reverse.morphologyHash);
  assert.equal(base.morphologyHash,duplicates.morphologyHash);
});
test('same log, model, and observation instant => identical state and SHA-256',()=>{
  const a=at(T.awake),b=at(T.awake);
  assert.deepEqual(a,b);
  assert.equal(a.morphologyHash,b.morphologyHash);
  assert.match(a.morphologyHash,/^[a-f0-9]{64}$/);
});
test('an unapproved inferred link cannot be used to produce fiber',()=>{
  const forged=structuredClone(fixture[2]);forged.payload.link.basis='inferred';
  assert.throws(()=>simulateMorphology([...fixture.slice(0,2),forged]),/explicit/);
});
test('a backdated life event is prohibited by Phase 1A preflight',()=>{
  const altered=structuredClone(fixture);altered[6].effectiveAt='2027-07-20T11:02:00Z';
  assert.throws(()=>simulateMorphology(altered),/effectiveAt must equal recordedAt/);
});
test('microsignal deterministic, clock based, returns no new archive or event',()=>{
  const s=at(T.awake),time='2036-07-21T00:00:00Z';
  const a=microSignal(s,'link:writing-site',time);
  assert.equal(a,microSignal(s,'link:writing-site',time));
  assert.ok(a>=0&&a<=.3);
  assert.equal(s.lifeCount,2);
});
test('metrics report nonzero tension and curvature when life links activated',()=>{
  const m=metrics(at(T.awake));
  assert.ok(m.meanBend>0);
  assert.ok(m.totalTension>0);
  assert.equal(m.branchCount,1);
});
test('no random sampling calls appear in dynamics source',()=>{
  const source=fs.readFileSync(new URL('../src/dynamics.mjs',import.meta.url),'utf8');
  assert.equal(source.includes('Math.random('),false);
});
test('maintenance-only edits cannot activate links even if link strength changed',()=>{
  const before=at('2030-01-10T10:01:30Z');
  assert.equal(before.fibers.length,0);
  const event=structuredClone(fixture[2]);event.payload.link.strength=1.6;
  const testLog=[...fixture.slice(0,2),event];
  assert.equal(simulateMorphology(testLog,{asOf:'2030-01-10T10:01:30Z'}).fibers.length,0);
});
test('link retraction deletes current fiber without manufacturing scar/life event',()=>{
  const retract={schema:'murmurgrove.event.v1',seq:9,eventId:'evt:retract-link',
    kind:'archive.link.retract',recordedAt:'2038-01-01T00:00:00Z',
    payload:{linkId:'link:writing-site',reason:'correction'}};
  const s=simulateMorphology([...fixture,retract],{asOf:'2038-01-02T00:00:00Z'});
  assert.equal(s.lifeCount,2);
  assert.equal(item(s.fibers,'link:writing-site'),undefined);
});
test('fossilization semigroup unaffected by no-op archive timestamps',()=>{
  const extra=structuredClone(fixture[7]);
  extra.seq=9;extra.eventId='evt:extra-correction';extra.recordedAt='2038-01-01T00:00:00Z';
  const time='2040-01-01T00:00:00Z';
  const a=simulateMorphology(fixture,{asOf:time});
  const b=simulateMorphology([...fixture,extra],{asOf:time});
  assert.equal(a.morphologyHash,b.morphologyHash);
});
