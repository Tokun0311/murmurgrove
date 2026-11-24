import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {MOVEMENT_RATE,BREATH_RATE,opticalTime,breathingTime,visibleOverviewMotion} from '../public/movement-pacing.mjs';
import {flowSamplesForRelation} from '../public/relation-flow.mjs';
const text=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const reference={'T0':'6d83b426de74ed737e0feb944fcc6266d0033c2a386ff9f19cc9cc32d173a16a','known-data-baseline.v1':'50c22ba7f38deb2109727040691638db94a6ec3344a9ccf0e3f2c39cec457651','navigation':'4c8c2195992779d4b1a085defae904cafddd4a466cddb85a7f0661fa0a84aa3f','manifest':'ca2758ecfd7e12eed478f6baec8a34012ed05fc261c06c832d57441c97ef3fd6'};
test('frozen archive, true relation topology, dates, and silent T0 retain their bytes',()=>{
 for(const [f,hash] of Object.entries(reference))assert.equal(createHash('sha256').update(text('data/'+f+'.json')).digest('hex'),hash);
});
test('Movement alone accelerates optical clock 6×, breathing stays at 4.5×',()=>{
 assert.equal(MOVEMENT_RATE,6);assert.equal(BREATH_RATE,4.5);
 assert.equal(opticalTime(2,'Movement'),12);assert.equal(breathingTime(2,'Movement'),9);
 assert.equal(opticalTime(2,'Whole'),2);assert.equal(opticalTime(2,'Growth'),2);
 assert.equal(breathingTime(2,'Whole'),2);assert.equal(breathingTime(2,'Growth'),2);
});
test('moving glints traverse ten times faster than the original baseline without extra source relations',()=>{
 const before=.095,after=.095*MOVEMENT_RATE,at=10.238;
 const actual=flowSamplesForRelation(7,at,'Movement',0);
 const expected=((7*.61803398875+at*after)%1+1)%1;
 assert.equal(actual.length,2);assert.ok(Math.abs(actual[0].t-expected)<1e-10);
 assert.ok(Math.abs(after/before-6)<1e-12);
 assert.ok(Math.abs(1/after-1.7543859649122806)<1e-12);
 assert.equal(flowSamplesForRelation(7,at,'Whole',0).length,1);
});
test('low zoom Movement drift becomes perceptible, smoothly capped, without shifting its reference',()=>{
 const base=[180,120,0],micro=[180.3,119.8,.03];
 for(const z of [.65,.75,1]){
  const enhanced=visibleOverviewMotion(base,micro,z,'Movement');
  assert.ok(Math.hypot(enhanced[0]-base[0],enhanced[1]-base[1])>Math.hypot(micro[0]-base[0],micro[1]-base[1]));
  assert.equal(enhanced[2],micro[2]);
  assert.deepEqual(base,[180,120,0]);
 }
 const far=visibleOverviewMotion(base,[220,190,.03],.65,'Movement');
 assert.ok(Math.hypot(far[0]-base[0],far[1]-base[1])<=2.4+1e-8);
 assert.deepEqual(visibleOverviewMotion(base,micro,.65,'Whole'),micro);
 assert.deepEqual(visibleOverviewMotion(base,micro,1.5,'Movement'),micro);
});
test('optical changes do not speed up 13-day decay, invent Writing, or activate links',()=>{
 const src=text('viewer.mjs');
 assert.match(src,/const TAU=13/);
 assert.match(src,/Math\.exp\(-days\/TAU\)/);
 assert.match(src,/const quietTime=time,breathClock=breathingTime\(time,mode\),waveClock=opticalTime\(time,mode\)/);
 assert.match(src,/quietParticlePosition\(data.id,p,quietTime\)/);
 assert.match(src,/approvedLifeEvents:livedEvidence\.length,authoredEvidenceTraces:livedTraces\.size,activatedWritingFibers:0,matureCores:0/);
 assert.match(src,/await verifyLoadedLivedEvidence\(\)/);
 assert.match(src,/return visibleOverviewMotion\(rest,calmMagnifiedMotion/);
 assert.match(src,/const strandTime=breathingTime\(time,mode\)/);
 assert.match(src,/flowSamplesForRelation\(index,time,mode,recent\)/);
 assert.match(src,/const ebb=\.91\+\.09\*Math\.sin\(breathClock\*\.27/);
});
