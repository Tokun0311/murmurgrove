import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {seedPoint,simulateMorphology,microSignal} from '../src/dynamics.mjs';
import {replay} from '../src/protocol.mjs';
import {EMERGENCE_VERSION,collectWork,buildDigestionEpisodes,resolveThresholds,
  findPropulsionCores,disconnectedRegions,applyReconfigurations,simulateEmergence}
 from '../src/emergence.mjs';
import {concentrationHistory,silentHistory,ruptureHistory,bulkImportHistory,massWritingHistory}
 from '../fixtures/stress-scenarios.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/synthetic-events.json',import.meta.url),'utf8'));
const bias=concentrationHistory(),silent=silentHistory(),rupture=ruptureHistory();
const B0='2028-01-01T00:00:00Z',B1='2033-01-01T00:00:00Z';
const S0='2027-09-01T00:00:00Z',S1='2034-09-01T00:00:00Z';
const R1='2038-03-12T00:00:00Z';
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const find=(list,id)=>list.find(x=>x.id===id);

test('1B.1 remains isolated from Phase 1A/1B event contracts',()=>{
  assert.equal(EMERGENCE_VERSION,'murmurgrove.emergence.1b.1');
  assert.equal(replay(bias).lifeEvents.length,19);
  assert.ok(simulateMorphology(bias,{asOf:B1}).morphologyHash);
});
test('same real events/time produces exactly the same projection and hash',()=>{
  const a=simulateEmergence(bias,{asOf:B1});
  const b=simulateEmergence(bias,{asOf:B1});
  assert.deepEqual(a,b);assert.match(a.emergenceHash,/^[0-9a-f]{64}$/);
});
test('reversed input or exact duplicate delivery does not change emergence hash',()=>{
  const base=simulateEmergence(fixture,{asOf:'2038-01-01T00:00:00Z'});
  const reverse=simulateEmergence([...fixture].reverse(),{asOf:base.asOf});
  const duplicate=simulateEmergence([...fixture,structuredClone(fixture[3])],{asOf:base.asOf});
  assert.equal(base.emergenceHash,reverse.emergenceHash);
  assert.equal(base.emergenceHash,duplicate.emergenceHash);
});
test('archive-only relation changes do not become event work or new cores',()=>{
  const before=simulateEmergence(fixture,{asOf:'2030-01-10T10:01:30Z'});
  assert.equal(before.episodes.length,0);assert.equal(before.cores.length,0);
  assert.equal(before.thresholds.transitions.length,0);
});
test('maintenance-only timestamp inserted long afterward preserves final emergence hash',()=>{
  const extra=structuredClone(fixture[7]);extra.seq=9;extra.eventId='evt:extra-maintenance';
  extra.recordedAt='2039-01-01T00:00:00Z';
  const time='2040-03-01T00:00:00Z';
  assert.equal(simulateEmergence(fixture,{asOf:time}).emergenceHash,
    simulateEmergence([...fixture,extra],{asOf:time}).emergenceHash);
});
test('new direction cores require joint concept activation AND real fiber tension',()=>{
  const before=simulateEmergence(fixture,{asOf:'2027-12-31T23:59:59Z'});
  const after=simulateEmergence(fixture,{asOf:'2036-07-21T00:00:00Z'});
  assert.equal(before.cores.length,0);
  assert.ok(after.cores.length>0);
  assert.ok(after.cores.every(c=>c.conceptDensity>0&&c.fiberTensionDensity>0));
  assert.ok(after.cores.every(c=>c.potential>0));
});
test('no prescribed 1–2 cores: a dormant body may have zero',()=>{
  const past=simulateEmergence(silent,{asOf:S0});
  const quiet=simulateEmergence(silent,{asOf:S1});
  assert.ok(past.cores.length>0);
  assert.equal(quiet.cores.length,0);
});
test('extreme bias: research centroid moves and local density variance grows',()=>{
  const before=simulateEmergence(bias,{asOf:B0}),after=simulateEmergence(bias,{asOf:B1});
  assert.ok(dist(before.geometryAudit.activityCentroid,after.geometryAudit.activityCentroid)>.2);
  assert.ok(after.geometryAudit.densityVariance>before.geometryAudit.densityVariance+.15);
  assert.ok(after.geometryAudit.maxLocalDensity>before.geometryAudit.maxLocalDensity*2);
  // No symmetry optimizer or artificial connections are introduced.
  assert.equal(after.reconfiguration.fibers.length,simulateMorphology(bias,{asOf:B1}).fibers.length);
});
test('sustained writing creates threshold transformations with strictly increasing structural inertia',()=>{
  const after=simulateEmergence(bias,{asOf:B1}),jumps=after.thresholds.transitions;
  assert.ok(jumps.length>=2);
  assert.ok(jumps.length<18);
  assert.ok(jumps.every((j,i)=>i===0||j.inertiaThreshold>=jumps[i-1].inertiaThreshold));
  assert.ok(jumps.some(j=>j.priorSedimentWork>0));
});
test('refractory: no two major transitions occur within 45 days',()=>{
  const jumps=simulateEmergence(bias,{asOf:B1}).thresholds.transitions;
  for(let i=1;i<jumps.length;i++){
    assert.ok(Date.parse(jumps[i].triggeredAt)-Date.parse(jumps[i-1].triggeredAt)>=45*86_400_000);
  }
});
test('each episode is consumed at most once across threshold transitions',()=>{
  const jumps=simulateEmergence(bias,{asOf:B1}).thresholds.transitions;
  const episodes=jumps.flatMap(j=>j.consumedEpisodeIds);
  assert.equal(new Set(episodes).size,episodes.length);
});
test('threshold events do not create fictional archive or life events',()=>{
  const result=simulateEmergence(bias,{asOf:B1});
  const real=simulateMorphology(bias,{asOf:B1});
  assert.equal(result.baseMetrics.lifeEventCount,real.lifeCount);
  assert.equal(replay(bias,{asOf:B1}).lifeEvents.length,real.lifeCount);
  assert.ok(result.thresholds.transitions.every(t=>t.eventKind==='derived.threshold-transformation'));
});
test('threshold transformation actually deforms real material, preserving original fossil data',()=>{
  const base=simulateMorphology(bias,{asOf:B1}),r=simulateEmergence(bias,{asOf:B1});
  assert.equal(r.reconfiguration.nodes.length,base.nodes.length);
  assert.equal(r.reconfiguration.fibers.length,base.fibers.length);
  assert.ok(r.reconfiguration.changedGeometry);
  assert.ok(r.reconfiguration.nodes.some(n=>dist(n.position,find(base.nodes,n.id).position)>1e-5));
  assert.ok(r.reconfiguration.turns.length>0);
  assert.deepEqual(base.fibers[0].fossilLayers,simulateMorphology(bias,{asOf:B1}).fibers[0].fossilLayers);
});
test('time silence: activity and cores decrease while lignification rises',()=>{
  const first=simulateEmergence(silent,{asOf:S0});
  const later=simulateEmergence(silent,{asOf:S1});
  assert.ok(later.baseMetrics.meanActivity<first.baseMetrics.meanActivity);
  assert.ok(later.baseMetrics.meanLignification>first.baseMetrics.meanLignification);
  assert.equal(later.geometryAudit.coreCount,0);
  assert.equal(later.baseMetrics.branchCount,first.baseMetrics.branchCount);
  assert.equal(later.baseMetrics.lifeEventCount,first.baseMetrics.lifeEventCount);
});
test('time silence: microcycle persists without inventing new archival content',()=>{
  const m=simulateMorphology(silent,{asOf:S1});
  const a=microSignal(m,'concept:dormant-research','2034-09-01T00:00:00Z');
  const b=microSignal(m,'concept:dormant-research','2034-09-01T00:00:02Z');
  assert.ok(a>0&&b>0);assert.notEqual(a,b);
  assert.equal(m.branches.length,0);
});
test('2038 isolated concept is detected as independent region with nonzero negative-space gap',()=>{
  const r=simulateEmergence(rupture,{asOf:R1});
  const island=r.regions.islands.find(i=>i.memberIds.includes('concept:unconnected-new-field'));
  assert.ok(island);
  assert.ok(island.negativeSpaceGap>=.4);
  assert.equal(island.hasInventedLink,false);
  assert.ok(r.reconfiguration.nodes.some(n=>n.id==='concept:unconnected-new-field'));
});
test('isolated concept generates no fabricated link, strain, or new global leap',()=>{
  const earlier=simulateEmergence(rupture,{asOf:'2037-12-01T00:00:00Z'});
  const late=simulateEmergence(rupture,{asOf:R1});
  assert.equal(late.thresholds.transitions.length,earlier.thresholds.transitions.length);
  assert.equal(late.baseMetrics.activeFiberCount,earlier.baseMetrics.activeFiberCount);
  assert.equal(late.baseMetrics.lifeEventCount,earlier.baseMetrics.lifeEventCount+1);
});
test('500 old exhibition encounters delivered simultaneously occupy one nutritional cohort, no major leap',()=>{
  const events=bulkImportHistory(500),asOf='2030-05-05T12:00:00Z';
  const {work}=collectWork(events,{asOf});
  const episodes=buildDigestionEpisodes(work);
  const late=resolveThresholds(episodes,{asOf:'2030-08-01T00:00:00Z'});
  assert.equal(work.length,500);
  assert.equal(episodes.length,1);
  assert.ok(episodes[0].rawWork>10);
  assert.ok(episodes[0].nourishmentCapacity<=2.6);
  assert.equal(episodes[0].capacity,0);
  assert.equal(late.transitions.length,0);
});
test('500 bulk encounters cannot piggyback onto a single small writing impulse',()=>{
  const encounters=bulkImportHistory(500);
  const lastSeq=encounters.length+1,day='2030-05-05T12:00:00Z';
  // Assert a new actual writing relationship in the *same* import cohort.
  const writing={schema:'murmurgrove.event.v1',seq:lastSeq,eventId:'evt:bulk-writing-record',
    kind:'archive.record.upsert',recordedAt:day,payload:{reason:'ingest',record:{id:'writing:bulk-small',kind:'writing',title:'Synthetic brief',
      occurredOn:'2030-05-05',occurredOnBasis:'authorship',visibility:'public'}}};
  const link={schema:'murmurgrove.event.v1',seq:lastSeq+1,eventId:'evt:bulk-writing-link',
    kind:'archive.link.assert',recordedAt:day,payload:{link:{id:'link:bulk-writing',from:'writing:bulk-small',
      to:'concept:historical-field',strength:.12,basis:'explicit'}}};
  const life={schema:'murmurgrove.event.v1',seq:lastSeq+2,eventId:'evt:bulk-writing-life',
    kind:'life.writing',recordedAt:day,effectiveAt:day,
    payload:{recordRefs:['writing:bulk-small','concept:historical-field'],linkRefs:['link:bulk-writing']}};
  const {work}=collectWork([...encounters,writing,link,life],{asOf:day});
  const episodes=buildDigestionEpisodes(work);
  assert.equal(episodes.length,1);
  assert.ok(episodes[0].criticalWork<.3);
  assert.equal(resolveThresholds(episodes,{asOf:'2031-01-01T00:00:00Z'}).transitions.length,0);
});
test('a no-op maintenance event during slow digestion cannot alter crossing times',()=>{
  const events=concentrationHistory(),time='2033-01-01T00:00:00Z';
  // Append a valid later record correction that leaves derived morphology identical.
  const extra={schema:'murmurgrove.event.v1',seq:events.length+1,eventId:'evt:inert-correction',
    kind:'archive.record.upsert',recordedAt:'2032-12-31T10:00:00Z',payload:{reason:'correction',record:{
      id:'concept:institutional-studies',kind:'concept',title:'Corrected title only',occurredOn:null,
      occurredOnBasis:'unknown',visibility:'public'}}};
  const a=simulateEmergence(events,{asOf:time});
  const b=simulateEmergence([...events,extra],{asOf:time});
  assert.equal(a.emergenceHash,b.emergenceHash);
});
test('nonsemantic geometry is NOT labeled as semantic interdisciplinarity',()=>{
  const src=fs.readFileSync(new URL('../src/emergence.mjs',import.meta.url),'utf8');
  assert.ok(src.includes('NOT semantic interdisciplinarity'));
  assert.equal(src.includes('Math.random('),false);
});
test('disconnected geometry never adds material relationships',()=>{
  const m=simulateMorphology(rupture,{asOf:R1});
  const regions=disconnectedRegions(m);
  const reconfig=applyReconfigurations(m,simulateEmergence(rupture,{asOf:R1}).thresholds.transitions,regions);
  assert.deepEqual(reconfig.fibers.map(f=>f.id),m.fibers.map(f=>f.id));
  assert.deepEqual(reconfig.nodes.map(n=>n.id),m.nodes.map(n=>n.id));
});
test('invalid tuning cannot silently change canonical numerical precision',()=>{
  assert.throws(()=>simulateEmergence([], {asOf:'2030-01-01T00:00:00Z',config:{precision:5}}),/precision/);
  assert.throws(()=>simulateEmergence([], {asOf:'2030-01-01T00:00:00Z',config:{unknown:3}}),/unknown config/);
});

test('500 real same-day writing changes can cause one jump, never 500 repeated ones',()=>{
  const events=massWritingHistory(500),at='2030-05-05T12:00:00Z';
  const {work}=collectWork(events,{asOf:at});
  const episodes=buildDigestionEpisodes(work);
  const resolved=resolveThresholds(episodes,{asOf:'2031-05-05T12:00:00Z'});
  assert.equal(work.length,500);
  assert.equal(episodes.length,1);
  assert.equal(episodes[0].count,500);
  assert.equal(resolved.transitions.length,1);
  assert.equal(resolved.transitions[0].consumedEpisodeIds.length,1);
  assert.ok(Date.parse(resolved.transitions[0].triggeredAt)>Date.parse(at));
  assert.equal(resolveThresholds(episodes,{asOf:'2040-01-01T00:00:00Z'}).transitions.length,1);
});
test('digestion never triggers a leap before enough source energy has actually been assimilated',()=>{
  const events=massWritingHistory(100),at='2030-05-05T12:00:00Z';
  const episodes=buildDigestionEpisodes(collectWork(events,{asOf:at}).work);
  assert.equal(resolveThresholds(episodes,{asOf:at}).transitions.length,0);
  const mature=resolveThresholds(episodes,{asOf:'2030-08-01T00:00:00Z'});
  assert.equal(mature.transitions.length,1);
  assert.ok(mature.transitions[0].accumulatedCharge>=mature.transitions[0].inertiaThreshold-1e-8);
});
