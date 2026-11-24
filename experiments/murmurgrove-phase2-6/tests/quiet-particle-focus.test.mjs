import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deriveInteriorQuietPositions,quietParticlePosition} from '../public/quiet-particles.mjs';
const src=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const json=name=>JSON.parse(src('data/'+name+'.json'));
const scene=json('T0'),nav=json('navigation');
const sourceSHA={
 'T0':'6d83b426de74ed737e0feb944fcc6266d0033c2a386ff9f19cc9cc32d173a16a',
 'known-data-baseline.v1':'50c22ba7f38deb2109727040691638db94a6ec3344a9ccf0e3f2c39cec457651',
 'navigation':'4c8c2195992779d4b1a085defae904cafddd4a466cddb85a7f0661fa0a84aa3f',
 'manifest':'ca2758ecfd7e12eed478f6baec8a34012ed05fc261c06c832d57441c97ef3fd6'
};
function components(){
 const adj=new Map(scene.nodes.map(n=>[n.id,new Set()]));
 for(const l of nav.metadataLinks)if(adj.has(l.from)&&adj.has(l.to)){adj.get(l.from).add(l.to);adj.get(l.to).add(l.from);}
 const groups=[],seen=new Set();for(const id of adj.keys()){
  if(seen.has(id))continue;const group=[],stack=[id];seen.add(id);
  while(stack.length){const next=stack.pop();group.push(next);for(const b of adj.get(next))if(!seen.has(b)){seen.add(b);stack.push(b);}}
  groups.push(group);
 }
 groups.sort((a,b)=>b.length-a.length);return groups;
}
const groups=components(),main=new Set(groups[0]),isolated=new Set(groups.filter(g=>g.length===1).flat());
const opticallyPlaced=deriveInteriorQuietPositions(scene.nodes,main,isolated);
const distance=(a,b)=>Math.hypot(...a.map((x,k)=>x-b[k]));
test('byte-level frozen archive sources remain unchanged',()=>{
 for(const [name,sha] of Object.entries(sourceSHA))assert.equal(createHash('sha256').update(src('data/'+name+'.json')).digest('hex'),sha);
});
test('every one of the 20 singletons has one deterministic interior display location, and source coordinates remain unchanged',()=>{
 const before=JSON.stringify(scene);
 assert.equal(main.size,123);assert.equal(isolated.size,20);assert.equal(opticallyPlaced.size,20);
 assert.deepEqual([...opticallyPlaced], [...deriveInteriorQuietPositions(scene.nodes,main,isolated)]);
 const mainPositions=scene.nodes.filter(n=>main.has(n.id)).map(n=>n.displayPosition);
 const lo=[0,1,2].map(k=>Math.min(...mainPositions.map(p=>p[k]))),hi=[0,1,2].map(k=>Math.max(...mainPositions.map(p=>p[k])));
 for(const [id,pos] of opticallyPlaced){
  assert.ok(isolated.has(id));assert.equal(pos.length,3);assert.ok(pos.every(Number.isFinite));
  assert.ok(pos.every((v,k)=>v>lo[k]&&v<hi[k]));
 }
 assert.equal(JSON.stringify(scene),before);
});
test('singleton visual positions do not cluster into a substitute satellite ring or merged central lump',()=>{
 const pts=[...opticallyPlaced.values()],sep=Math.min(...pts.flatMap((p,i)=>pts.slice(i+1).map(q=>distance(p,q))));
 assert.ok(sep>.15,`Nearest two disconnected specimens overlap: ${sep}`);
 const radii=pts.map(p=>Math.hypot(p[0],p[1]));
 assert.ok(Math.max(...radii)-Math.min(...radii)>.25,'locations need multiple inside-body depths');
});
test('disconnected particles have bounded individual optical motion, with no drift from their rest location',()=>{
 for(const [id,rest] of opticallyPlaced){
  const a=quietParticlePosition(id,rest,100),b=quietParticlePosition(id,rest,125),again=quietParticlePosition(id,rest,100);
  assert.deepEqual(a,again);assert.notDeepEqual(a,b);
  for(const t of [0,100,500,1000,100000])assert.ok(distance(quietParticlePosition(id,rest,t),rest)<.014);
 }
});
test('source has exactly 158 nonactivated metadata links and no invented life fibers',()=>{
 const ids=new Set(scene.nodes.map(n=>n.id));
 assert.equal(nav.metadataLinks.filter(l=>ids.has(l.from)&&ids.has(l.to)&&!l.activated).length,158);
 assert.equal(scene.fibers.length,0);assert.equal(scene.pulseChambers.length,0);assert.equal(scene.propulsionCores.length,0);
 const linksById=new Set(nav.metadataLinks.filter(l=>ids.has(l.from)&&ids.has(l.to)).flatMap(l=>[l.from,l.to]));
 assert.ok([...isolated].every(id=>!linksById.has(id)));
});
test('click on desktop or mobile selects and tracks a particle; only the card title is a primary archive link',()=>{
 const code=src('viewer.mjs'),html=src('index.html');
 assert.match(code,/const hit=nearest\(x,y\);selectAndFollow\(hit\?\.id\?\?null\)/);
 assert.match(code,/function selectAndFollow\(id/);
 assert.match(code,/followSelected=zoom>1/);
 assert.match(code,/if\(followSelected&&selected&&zoom>1\)/);
 assert.match(code,/W\*\.5,H\*\.46/);
 assert.match(code,/const pointed=coords\(viewPositions\[focusIndex\]\)/);
 assert.match(code,/zoom>=8\?coords\(viewPositions\[i\]\):pos\[i\]/);
 assert.match(code,/ZOOM_MAX=24/);
 assert.match(code,/saveMemory\(\).*followSelected/s);
 assert.match(code,/\$\('cardLink'\)\.onclick=\(\)=>\{saveMemory\(\);\}/);
 assert.match(html,/<a id="cardLink" class="card-link" href="#"><div class="card-title" id="cardTitle"><\/div><\/a><div class="role" id="cardRole"><\/div>/);
});
test('calm unlinked specimen cannot enter other groups’ Gaussian direction field or neighbor pulse transfer',()=>{
 const code=src('viewer.mjs');
 assert.match(code,/componentById\.get\(n\.id\)!==componentById\.get\(nodes\[j\]\.id\)/);
 assert.match(code,/isolated\.has\(n\.id\)\|\|isolated\.has\(p\.id\)/);
 assert.match(code,/if\(isol\)return quietParticlePosition\(data\.id,p,quietTime\)/);
});
