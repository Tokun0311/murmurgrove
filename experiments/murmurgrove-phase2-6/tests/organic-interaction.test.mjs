import test from 'node:test';
import assert from 'node:assert/strict';
import {mangroveControls,panForCursorZoom,easePanHome} from '../public/organic-interaction.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const root=new URL('../public/data/',import.meta.url);
const load=n=>JSON.parse(readFileSync(new URL(n+'.json',root),'utf8'));
const sha=n=>createHash('sha256').update(readFileSync(new URL(n+'.json',root))).digest('hex');

test('Phase 2.6.1 keeps original real T0, baseline, navigation and manifest files byte-identical',()=>{
 const files=['T0','known-data-baseline.v1','navigation','manifest'];
 assert.deepEqual(files.map(sha),[
  '6d83b426de74ed737e0feb944fcc6266d0033c2a386ff9f19cc9cc32d173a16a','50c22ba7f38deb2109727040691638db94a6ec3344a9ccf0e3f2c39cec457651','4c8c2195992779d4b1a085defae904cafddd4a466cddb85a7f0661fa0a84aa3f','ca2758ecfd7e12eed478f6baec8a34012ed05fc261c06c832d57441c97ef3fd6'
 ]);
});
test('mangrove curve controls are finite, nontrivial and preserve real source endpoints',()=>{
 const a=[14,30],b=[194,30],a0=[...a],b0=[...b];
 const controls=mangroveControls(a,b,[1,0],[1,0],1);
 assert.equal(controls.length,2);
 assert.ok(controls.flat().every(Number.isFinite));
 assert.deepEqual(a,a0);assert.deepEqual(b,b0);
 // Curves bend downward instead of hiding as straight chords.
 assert.ok(controls[0][1]>10&&controls[1][1]>10);
});
test('all three micro-threads share source endpoints and remain small optical variants',()=>{
 const a=[4,7],b=[201,80],fieldA=[.2,.9],fieldB=[.7,-.25];
 const variants=[0,1,2].map(i=>mangroveControls(a,b,fieldA,fieldB,i));
 assert.ok(variants.every(c=>c.flat().every(Number.isFinite)));
 assert.notDeepEqual(variants[0],variants[1]);assert.notDeepEqual(variants[1],variants[2]);
 assert.ok(variants.every(([p,q])=>Math.hypot(...p.map((v,i)=>v-a[i]))<130));
});
test('short and coincident links cannot explode into loops or non-finite positions',()=>{
 for(const b of [[0,0],[.001,.001],[3,2],[0,40]]){
  const controls=mangroveControls([0,0],b,[0,0],[0,0],1);
  assert.ok(controls.flat().every(Number.isFinite));
  for(const c of controls)assert.ok(Math.hypot(...c)<100);
 }
});
test('cursor-anchored zoom keeps the same biological point exactly under the pointer',()=>{
 for(const [oldZ,newZ] of [[.65,1.4],[1.4,4],[4,10],[10,6],[5,.9],[.65,1]]){
  const p=[124,-80],c=[200,240],mouse=[310,155],pan=[35,-19],scale=200;
  const before=c.map((v,i)=>v+pan[i]+p[i]*scale*oldZ);
  const next=panForCursorZoom(pan,oldZ,newZ,mouse,c);
  const after=c.map((v,i)=>v+next[i]+p[i]*scale*newZ);
  const ratio=newZ/oldZ;
  // Any 2D point scales about mouse, exact within numerical precision.
  for(let i=0;i<2;i++)assert.ok(Math.abs(after[i]-(mouse[i]+(before[i]-mouse[i])*ratio))<1e-7);
  const sourceAtMouse=p.map((_,i)=>(mouse[i]-c[i]-pan[i])/(scale*oldZ));
  const sourceAfter=p.map((_,i)=>(mouse[i]-c[i]-next[i])/(scale*newZ));
  for(let i=0;i<2;i++)assert.ok(Math.abs(sourceAfter[i]-sourceAtMouse[i])<1e-10);
 }
});
test('zoom to pointer in both positive and negative directions; 1x home approaches zero smoothly',()=>{
 const a=panForCursorZoom([0,0],.65,2.0,[320,150],[195,400]);
 assert.ok(Math.hypot(...a)>100);
 const after120=easePanHome(a,120),after240=easePanHome(after120,120);
 assert.ok(Math.hypot(...after120)>0);
 assert.ok(Math.hypot(...after240)<Math.hypot(...after120));
 assert.ok(Math.hypot(...easePanHome(a,4000))<.1);
});
test('mouse wheel, double click and touch pinch use cursor/midpoint; camera pan persists across browser Back',()=>{
 const script=readFileSync(new URL('../public/viewer.mjs',import.meta.url),'utf8');
 assert.match(script,/panForCursorZoom\(pan,old,next,anchor/);
 assert.match(script,/setZoom\(zoom\*Math\.exp\(-e\.deltaY\*\.001\),lastPointer\)/);
 assert.match(script,/setZoom\(zoom<2\?2:zoom\*1\.5,lastPointer\)/);
 assert.match(script,/setZoom\(zoom\*d\/pinchDist,midpoint\)/);
 assert.match(script,/panNorm:/);
 assert.match(script,/if\(zoom<=1\)\{followSelected=false;pan=easePanHome\(pan,dt\);\}/);
 assert.match(script,/ctx\.bezierCurveTo/);
 assert.doesNotMatch(script,/ctx\.lineTo\(q\[0\],q\[1\]\)/);
});
test('real relation and biological trust rules unchanged by micro patch',()=>{
 const nav=load('navigation'),s=load('T0'),ids=new Set(s.nodes.map(n=>n.id));
 assert.equal(nav.metadataLinks.filter(l=>ids.has(l.from)&&ids.has(l.to)).length,158);
 assert.equal(s.fibers.length,0);assert.equal(s.propulsionCores.length,0);
 const script=readFileSync(new URL('../public/viewer.mjs',import.meta.url),'utf8');
 assert.match(script,/links=nav\.metadataLinks\.filter/);
 assert.match(script,/const \[p1,p2\]=mangroveControls\(p,q,fieldScreen\[ai\],fieldScreen\[bi\],k,mode,time\)/);
});
