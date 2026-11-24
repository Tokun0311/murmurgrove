import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cubicBezierAt,flowSamplesForRelation} from '../public/relation-flow.mjs';
import {mangroveControls} from '../public/organic-interaction.mjs';
import {MOVEMENT_RATE,opticalTime} from '../public/movement-pacing.mjs';
const read=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const nav=JSON.parse(read('data/navigation.json'));
const scene=JSON.parse(read('data/T0.json'));
const sources=new Set(scene.nodes.map(n=>n.id));
const actual=nav.metadataLinks.filter(l=>sources.has(l.from)&&sources.has(l.to)&&!l.activated);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

test('source topology stays frozen with 158 verified metadata links and no activated Writing',()=>{
 assert.equal(actual.length,158);
 assert.equal(scene.fibers.length,0);
 assert.equal(scene.pulseChambers.length,0);
 assert.equal(hash(read('data/T0.json')),'6d83b426de74ed737e0feb944fcc6266d0033c2a386ff9f19cc9cc32d173a16a');
});
test('6x traversal is applied exactly once and advances continuously at .57 curve / second',()=>{
 assert.equal(MOVEMENT_RATE,6);
 for(const id of [0,5,51,157]){
  const before=flowSamplesForRelation(id,12.345,'Movement',0)[0];
  const after=flowSamplesForRelation(id,12.445,'Movement',0)[0];
  const delta=(after.t-before.t+1)%1;
  assert.ok(Math.abs(delta-.057)<1e-9,`source ${id}: expected .057, got ${delta}`);
  assert.ok(Math.abs(1/(.095*MOVEMENT_RATE)-1.7543859649122806)<1e-12);
 }
 // The old double speed gave .95 of a full path in just 100 ms.
 const js=read('viewer.mjs');
 assert.match(js,/flowSamplesForRelation\(index,time,mode,recent\)/);
 assert.doesNotMatch(js,/flowSamplesForRelation\(index,strandTime,mode,recent\)/);
});
test('Movement uses a short fading wake on verified Bezier paths, never free-floating geometry',()=>{
 const a=[20,30],b=[160,74],f1=[1,.35],f2=[1,-.25];
 const [c1,c2]=mangroveControls(a,b,f1,f2,1,'Movement',4);
 for(const s of flowSamplesForRelation(9,12.345,'Movement',.2)){
  assert.ok(s.t>=0&&s.t<1&&s.tail>0&&s.tail<=.105&&s.radius<=.9);
  const start=Math.max(0,s.t-s.tail);
  for(let j=0;j<=10;j++){
   const xyz=cubicBezierAt(a,c1,c2,b,start+(s.t-start)*j/10);
   assert.ok(xyz.every(Number.isFinite));
  }
 }
 assert.equal(flowSamplesForRelation(9,12.345,'Whole',0)[0].tail,0);
 const js=read('viewer.mjs');
 assert.match(js,/const start=Math.max\(0,sample\.t-sample\.tail\)/);
 assert.match(js,/const v=cubicBezierAt\(a,c1,c2,b,t\)/);
 assert.match(js,/links\.forEach\(\(link,index\)=>/);
});
test('local node motion stays slow while nonstatic wave phase is spatially propagated',()=>{
 const js=read('viewer.mjs');
 assert.match(js,/const localWave=Math.sin\(waveClock\*\.18 - p\[0\]\*3\.5 - p\[1\]\*1\.7/);
 assert.match(js,/const u=Math.sin\(breathClock\*\.43/);
 assert.match(js,/time=breathClock; \/\/ slow organic shape breathing/);
 assert.match(js,/quietParticlePosition\(data.id,p,quietTime\)/);
 assert.match(js,/const TAU=13/);
});
