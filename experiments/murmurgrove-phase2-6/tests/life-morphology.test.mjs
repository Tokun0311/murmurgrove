import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {deriveLifeMorphology,lifeRecordMap,applyLifeOffset,eventReconstructionTimes,LIFE_RULE_VERSION} from '../public/life-morphology.mjs';
import {canonicalJSON} from '../public/version-chronicle.mjs';
const root=new URL('../public/data/',import.meta.url);
const nav=JSON.parse(await readFile(new URL('navigation.json',root),'utf8'));
const t0=JSON.parse(await readFile(new URL('T0.json',root),'utf8'));
const shown=nav.records.filter(r=>!r.quarantined),ids=new Set(shown.map(r=>r.id));
const nodes=t0.nodes.map(n=>({id:n.id,position:n.displayPosition}));
const links=nav.metadataLinks.filter(l=>ids.has(l.from)&&ids.has(l.to)&&!l.activated);
const time='2026-11-24T12:00:00.000Z';
function ev(id,kind='life.encounter',date='2026-11-22T12:00:00.000Z',seq=1){return {
 schema:'murmurgrove.lived-evidence.v1',event:{schema:'murmurgrove.event.v1',seq,eventId:`evt:test${seq}`,kind,recordedAt:date,effectiveAt:date,payload:{recordRefs:[id],linkRefs:[],note:'I explicitly reviewed and interpreted this archive entry.'}},
 source:{attestation:'I_CONFIRM_THIS_RESEARCH_ACTION_OCCURRED'}};}
const run=(evidence,asOf=time)=>deriveLifeMorphology({nodes,links,evidence,asOf});
const h=x=>createHash('sha256').update(canonicalJSON(x)).digest('hex');
test('actual baseline remains 174 nodes 158 visible relations with zero authored events',()=>{
 assert.equal(nodes.length,174);assert.equal(links.length,158);
 const result=run([]);assert.equal(result.schema,LIFE_RULE_VERSION);
 assert.equal(result.authoredEventsUsed,0);assert.equal(result.activeRecords,0);assert.equal(result.sedimentaryRecords,0);
 assert.equal(result.activatedFibers,0);assert.equal(result.matureCores,0);
 assert.ok(result.records.every(r=>r.offset.every(x=>x===0)&&r.attention===0&&r.sediment===0&&r.resonance===0));
});
test('real source topology and positions are not mutated by any morphology projection',()=>{
 const before=h({nodes,links}),result=run([ev(nodes[0].id,'life.reinterpretation')]);
 assert.equal(h({nodes,links}),before);assert.equal(result.sourceNodeCount,174);assert.equal(result.sourceLinkCount,158);
 assert.equal(result.records.length,174);assert.ok(result.records.every(r=>r.offset.every(x=>Math.abs(x)<=.025)));
});
test('replayed identical source+time produces identical model state and digest',()=>{
 const events=[ev(nodes[0].id),ev(nodes[1].id,'life.reinterpretation','2026-11-23T12:00:00.000Z',2)];
 assert.equal(h(run(events)),h(run(structuredClone(events))));
 assert.equal(h(run(events)),h(run(events)));
});
test('encounter is temporary attention, reinterpretation leaves bounded sediment, neither makes writing',()=>{
 const id=nodes[0].id;
 const state=run([ev(id),ev(id,'life.reinterpretation','2026-11-23T12:00:00.000Z',2)]);
 const r=lifeRecordMap(state).get(id);assert.ok(r.attention>0&&r.sediment===.12);
 const later=lifeRecordMap(run([ev(id),ev(id,'life.reinterpretation','2026-11-23T12:00:00.000Z',2)],'2027-11-24T12:00:00.000Z')).get(id);
 assert.ok(later.attention<r.attention);assert.equal(later.sediment,.12);
 assert.equal(state.activatedFibers,0);assert.equal(state.matureCores,0);
});
test('neighbor attention travels only over existing baseline edges and is bounded',()=>{
 const edge=links[0],r=lifeRecordMap(run([ev(edge.from)]));
 assert.ok(r.get(edge.to).resonance>0);
 const isolated=nodes.find(n=>!links.some(e=>e.from===n.id||e.to===n.id));
 assert.equal(r.get(isolated.id).resonance,0);
 assert.ok(r.get(edge.to).resonance<=.23);
});
test('future events are not projected into earlier model time',()=>{
 const id=nodes[0].id,act=ev(id,'life.reinterpretation','2026-11-23T12:00:00.000Z');
 assert.equal(run([act],'2026-11-21T00:00:00.000Z').authoredEventsUsed,0);
 assert.equal(lifeRecordMap(run([act],'2026-11-21T00:00:00.000Z')).get(id).sediment,0);
 assert.equal(eventReconstructionTimes([act])[0].at,act.event.recordedAt);
});
test('unattested, forged, or unsupported semantic events are refused',()=>{
 const id=nodes[0].id,act=ev(id);
 assert.throws(()=>run([{...act,source:{attestation:'auto'}}]),/Unattested/);
 assert.throws(()=>run([{...act,event:{...act.event,kind:'life.writing'}}]),/Unsupported activation/);
 assert.throws(()=>run([{...act,event:{...act.event,payload:{...act.event.payload,linkRefs:['invented']}}}]),/Unsupported activation/);
 assert.throws(()=>run([ev('person:nonexistent')]),/missing or quarantined/);
});
test('duplicate ids, malformed structure, duplicate events and time ambiguity are refused',()=>{
 const id=nodes[0].id;
 assert.throws(()=>run([ev(id),ev(id)]),/ordered sealed|Duplicate/);
 assert.throws(()=>deriveLifeMorphology({nodes:[nodes[0],nodes[0]],links:[],evidence:[],asOf:time}),/Duplicate node/);
 assert.throws(()=>deriveLifeMorphology({nodes,links:[links[0],links[0]],evidence:[],asOf:time}),/Duplicate morphology edge/);
 assert.throws(()=>run([],'sometime'),/UTC asOf/);
});
test('offset is a bounded visual projection and does not change source position',()=>{
 const id=nodes[0].id,orig=[...nodes[0].position],rec=lifeRecordMap(run([ev(id)])).get(id);
 const updated=applyLifeOffset(orig,rec);
 assert.deepEqual(nodes[0].position,orig);assert.notDeepEqual(updated,orig);
 assert.deepEqual(applyLifeOffset(orig,null),orig);
});
test('runtime has an explicit life history tab and baseline-source evidence guard',async()=>{
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 const js=await readFile(new URL('../public/viewer.mjs',import.meta.url),'utf8');
 assert.match(html,/historyLifeTab/);assert.match(html,/lifeModelBadge/);
 assert.match(js,/await verifyLoadedLivedEvidence/);assert.match(js,/deriveLifeMorphology\(/);
 assert.match(js,/activatedWritingFibers:0,matureCores:0/);
});
