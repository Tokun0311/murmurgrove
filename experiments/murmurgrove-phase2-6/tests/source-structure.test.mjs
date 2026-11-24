import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sourceStructure,validateStructureCounts,SOURCE_READING_MODE} from '../public/source-structure.mjs';
import {readVerifiedSourceState,verifyChronicle} from '../public/version-chronicle.mjs';
const raw=path=>readFileSync(new URL('../public/'+path,import.meta.url),'utf8');
const load=path=>JSON.parse(raw(path));
const sha=text=>createHash('sha256').update(text).digest('hex');
const nav=load('data/navigation.json'),snapshot=load('data/T0.json'),index=load('data/chronicle/index.json');
const t0IDs=snapshot.nodes.map(n=>n.id),copy=o=>structuredClone(o);
test('checkpoint chain validates before any version is offered',async()=>{
 const result=await verifyChronicle(index,async text=>sha(text));
 assert.equal(result.valid,true);assert.equal(result.checkpointCount,1);
});
test('baseline source is checksum-validated before projecting any nodes',async()=>{
 const state=await readVerifiedSourceState(index.entries[0],async path=>raw(path),async text=>sha(text));
 const projection=sourceStructure(state.navigation,t0IDs);
 assert.equal(projection.mode,SOURCE_READING_MODE);
 assert.equal(projection.drawableCount,174);assert.equal(projection.drawableEdges,158);
 assert.equal(projection.visibleSourceCount,174);assert.equal(projection.visibleSourceEdges,158);
 assert.equal(projection.unplaced.length,0);assert.equal(projection.omittedEdges,0);
 assert.equal(projection.simulatedHistoricalMorphologies,0);assert.equal(projection.activatedFibers,0);
 assert.equal(projection.independentDrawable,20);
 assert.equal(validateStructureCounts(projection,index.entries[0]),true);
});
test('byte-level source tampering blocks reading even if JSON parses',async()=>{
 await assert.rejects(readVerifiedSourceState(index.entries[0],async path=>raw(path)+' ',async text=>sha(text)),/modified/);
});
test('new item without T0 location is LISTED, never assigned a fabricated position',()=>{
 const next=copy(nav),newId='institution:future-record-without-t0';
 next.records.push({...next.records[1],id:newId,title:'Provenance-only, not placed',quarantined:false,verification:null});
 const p=sourceStructure(next,t0IDs,nav);
 assert.equal(p.visibleSourceCount,175);assert.equal(p.drawableCount,174);
 assert.deepEqual(p.unplaced.map(x=>x.id),[newId]);assert.ok(!p.projectedIds.has(newId));
 assert.ok(p.addedIds.has(newId));assert.equal(p.drawableEdges,158);
});
test('new verified metadata link can be shown only if both real source endpoints have T0 locations',()=>{
 const next=copy(nav);
 const from=[...t0IDs][0],to=[...t0IDs][1];
 const e={from,to,sourceField:'explicit-ref-v2',status:'METADATA_ONLY',activated:false};
 next.metadataLinks.push(e);
 const p=sourceStructure(next,t0IDs,nav);
 assert.equal(p.drawableEdges,159);assert.equal(p.visibleSourceEdges,159);
 const newEdge=p.projectedEdges.find(x=>x.from===from&&x.to===to&&x.sourceField==='explicit-ref-v2');
 assert.ok(newEdge);assert.ok(p.addedLinks.has(newEdge.key));
 assert.equal(p.activatedFibers,0);
});
test('link involving an unplaced new record is counted as source evidence, not drawn as an invented link',()=>{
 const next=copy(nav),added='person:future-with-no-geometry';
 next.records.push({...next.records[1],id:added,title:'Unplaced',quarantined:false,verification:null});
 next.metadataLinks.push({from:t0IDs[0],to:added,sourceField:'people',status:'METADATA_ONLY',activated:false});
 const p=sourceStructure(next,t0IDs,nav);
 assert.equal(p.visibleSourceEdges,159);assert.equal(p.drawableEdges,158);assert.equal(p.omittedEdges,1);
});
test('quarantined records and source links cannot be silently promoted to the body',()=>{
 const one=nav.records.find(r=>r.quarantined);assert.ok(one);
 const p=sourceStructure(nav,t0IDs);
 assert.ok(!p.projectedIds.has(one.id));assert.equal(p.unplaced.length,0);
 const bad=copy(nav);bad.metadataLinks[0].activated=true;
 assert.throws(()=>sourceStructure(bad,t0IDs),/activated source link/);
});
test('duplicate metadata, changed source counts and forged geometry are rejected',()=>{
 const bad=copy(nav);bad.metadataLinks.push(copy(bad.metadataLinks[0]));
 assert.throws(()=>sourceStructure(bad,t0IDs),/Duplicate source link/);
 assert.throws(()=>sourceStructure(nav,[...t0IDs,t0IDs[0]]),/Duplicate reference geometry/);
 const p=sourceStructure(nav,t0IDs);assert.throws(()=>validateStructureCounts(p,{counts:{displayed:175,verifiedVisibleReferences:158}}),/counts/);
});
test('source-reading UI is a static, reversible, source-attested layer rather than simulated history',()=>{
 const js=raw('viewer.mjs'),html=raw('index.html');
 assert.match(js,/readVerifiedSourceState\(entry/);
 assert.match(js,/if\(sourceView\)\{/);
 assert.match(js,/drawSourceReading\(\)/);
 assert.match(js,/versionRequest\+\+/);
 assert.match(js,/sourceStructure\(current,nodes\.map\(n=>n\.id\),previous\)/);
 assert.match(html,/id="sourceReadingBadge" hidden/);
 assert.match(html,/不是历史生命形态/);
 assert.doesNotMatch(js,/replayHistoricBody\(/);
});
