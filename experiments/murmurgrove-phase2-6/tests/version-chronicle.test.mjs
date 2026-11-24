import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonicalJSON,verifyChronicle,verifySelectedSources,compareArchiveSources} from '../public/version-chronicle.mjs';
const src=n=>readFileSync(new URL('../public/'+n,import.meta.url),'utf8');
const index=JSON.parse(src('data/chronicle/index.json'));
const nav=JSON.parse(src('data/navigation.json'));
const digest=x=>createHash('sha256').update(x).digest('hex');
const jsonClone=x=>JSON.parse(JSON.stringify(x));
test('the chronicle has exactly one proven initial source checkpoint, not a replay',async()=>{
 const info=await verifyChronicle(index,async v=>digest(v));
 assert.equal(info.checkpointCount,1);
 const first=index.entries[0];
 assert.equal(first.sourceCalendarDate,'2026-11-19');
 assert.equal(first.capturedAt,null);assert.equal(first.authorApproval,'not-asserted');
 assert.match(first.opticalGeometry.meaning,/NOT observed morphology/);
 assert.equal(first.counts.records,181);assert.equal(first.counts.displayed,174);
 assert.equal(first.counts.metadataReferences,172);assert.equal(first.counts.verifiedVisibleReferences,158);
 assert.equal(first.counts.independentVisibleRecords,20);assert.equal(first.counts.approvedLifeEvents,0);
 assert.equal(first.changes,null);
});
test('original source bytes and silent reference geometry match pinned checksum',async()=>{
 const first=index.entries[0];
 await verifySelectedSources(first,async path=>src(path),async v=>digest(v));
 assert.equal(first.opticalGeometry.sha256,digest(src('data/T0.json')));
 const s=JSON.parse(src('data/T0.json'));
 assert.equal(s.mode,'SIMULATED_SANDBOX');
 assert.equal(s.fibers.length,0);
});
test('index checksum tampering and forged chain are safely rejected',async()=>{
 const altered=jsonClone(index);altered.entries[0].counts.records=182;
 await assert.rejects(verifyChronicle(altered,async v=>digest(v)),/index digest mismatch/);
 const retampered=jsonClone(altered);delete retampered.indexHash;retampered.indexHash=digest(canonicalJSON(retampered));
 await assert.rejects(verifyChronicle(retampered,async v=>digest(v)),/Checkpoint digest mismatch/);
});
test('source modification is detected against real, byte-level checksum',async()=>{
 await assert.rejects(verifySelectedSources(index.entries[0],async path=>src(path)+' ',async v=>digest(v)),/Source file modified/);
});
test('comparisons are deterministic and describe evidence changes, not biological events',()=>{
 const a=jsonClone(nav),b=jsonClone(nav);
 b.records[0].title+=' revised';
 b.records.push({...b.records[0],id:'concept:careful-new-record'});
 b.metadataLinks.push({...b.metadataLinks[0],to:'concept:careful-new-record'});
 const diff=compareArchiveSources(a,b);
 assert.equal(diff.recordsAdded,1);assert.equal(diff.recordsRemoved,0);
 assert.equal(diff.recordsEdited,1);assert.equal(diff.referencesAdded,1);
 assert.equal(diff.referencesRemoved,0);
 assert.deepEqual(diff.recordIds.added,['concept:careful-new-record']);
 assert.deepEqual(compareArchiveSources(a,a).recordIds,{added:[],removed:[],edited:[]});
});
test('new history UI distinguishes visit dates from archive-version evidence and avoids synthetic body playback',()=>{
 const html=src('index.html'),js=src('viewer.mjs');
 assert.match(html,/id="historyVersionsTab"/);
 assert.match(html,/id="historyVisitView"/);
 assert.match(html,/id="historyVersionView"/);
 assert.match(html,/档案来源与版本差异，不是生命事件/);
 assert.match(js,/verifyChronicle\(chronicleIndex,shaRawText\)/);
 assert.match(js,/verifySelectedSources\(e,/);
 assert.match(js,/activeHistoryContext=null;/);
 assert.match(js,/verifiedHistoricalMorphologies:0/);
 assert.doesNotMatch(js,/replayHistoricBody\(/);
});
test('version index is append-only source evidence, and captured originals remain untouched',()=>{
 const srcText=src('data/chronicle/index.json');
 assert.ok(srcText.includes('READ_ONLY_SOURCE_EVIDENCE_NOT_BIOLOGICAL_REWIND'));
 assert.equal(index.entries.length,1);
 assert.equal(digest(src('data/known-data-baseline.v1.json')),'50c22ba7f38deb2109727040691638db94a6ec3344a9ccf0e3f2c39cec457651');
});
