import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cubicBezierAt,flowSamplesForRelation} from '../public/relation-flow.mjs';
const text=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const json=name=>JSON.parse(text('data/'+name+'.json'));
const t0=json('T0'),nav=json('navigation');
const hashes={
 'known-data-baseline.v1':'50c22ba7f38deb2109727040691638db94a6ec3344a9ccf0e3f2c39cec457651',
 'T0':'6d83b426de74ed737e0feb944fcc6266d0033c2a386ff9f19cc9cc32d173a16a',
 'navigation':'4c8c2195992779d4b1a085defae904cafddd4a466cddb85a7f0661fa0a84aa3f',
 'manifest':'ca2758ecfd7e12eed478f6baec8a34012ed05fc261c06c832d57441c97ef3fd6'
};
test('underlying knowledge baseline and snapshots stay byte-for-byte pinned',()=>{
 for(const [k,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(text('data/'+k+'.json')).digest('hex'),hash,k);
});
test('three visible angle glyphs are quiet while three internal semantics and accessibility remain',()=>{
 const html=text('index.html');
 const mode=html.match(/<div class="glass" id="mode"[\s\S]*?<\/div>/)?.[0]??'';
 assert.equal((mode.match(/<button/g)||[]).length,3);
 for(const [value,label] of [['Whole','观察角度一'],['Growth','观察角度二'],['Movement','观察角度三']]){
  assert.match(mode,new RegExp('data-mode="'+value+'"'));
  assert.match(mode,new RegExp('aria-label="'+label+'"'));
 }
 assert.doesNotMatch(mode,/>Whole<|>Growth<|>Movement</);
});
test('bezier point always adheres to both real endpoints and remains finite',()=>{
 const a=[0,2],b=[20,4],c1=[4,-8],c2=[15,17];
 assert.deepEqual(cubicBezierAt(a,c1,c2,b,0),a);
 assert.deepEqual(cubicBezierAt(a,c1,c2,b,1),b);
 for(let i=0;i<=100;i++)assert.ok(cubicBezierAt(a,c1,c2,b,i/100).every(Number.isFinite));
 assert.throws(()=>cubicBezierAt(a,c1,c2,b,-.01),/outside/);
});
test('glints remain a bounded, deterministic read-only fraction of verified links',()=>{
 const ids=new Set(t0.nodes.map(x=>x.id));
 const actual=nav.metadataLinks.filter(l=>ids.has(l.from)&&ids.has(l.to)&&!l.activated);
 assert.equal(actual.length,158);
 for(const m of ['Whole','Growth','Movement'])for(let i=0;i<actual.length;i++){
  const a=flowSamplesForRelation(i,83219.2,m,.2),b=flowSamplesForRelation(i,83219.2,m,.2);
  assert.deepEqual(a,b);
  assert.equal(a.length,m==='Movement'?2:1);
  assert.ok(a.every(v=>v.t>=0&&v.t<1&&v.alpha>=0&&v.alpha<=.5&&v.radius<=.9&&v.tail>=0&&v.tail<=.105));
 }
 assert.match(text('viewer.mjs'),/links\.forEach\(\(link,index\)=>/);
 assert.match(text('viewer.mjs'),/mangroveControls\(a,b,fieldScreen\[ai\],fieldScreen\[bi\],1,mode,strandTime\)/);
 assert.doesNotMatch(text('viewer.mjs'),/sampleCount=mode==='Movement'\?8/);
});
test('V&A is a nonquarantined institution with no declared relationships in this frozen graph',()=>{
 const id='institution:victoria-and-albert-museum';
 assert.equal(nav.records.find(r=>r.id===id)?.path,'/institutions/victoria-and-albert-museum/');
 assert.ok(t0.nodes.some(n=>n.id===id));
 assert.equal(nav.metadataLinks.filter(l=>l.from===id||l.to===id).length,0);
 assert.match(text('viewer.mjs'),/尚未建立明确的档案关联/);
 assert.match(text('viewer.mjs'),/Institutional anchor \/ 机构锚点 · 未激活/);
});
