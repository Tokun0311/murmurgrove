import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {curve,deriveGeometry,mainDeclaredComponent} from '../public/adapter.mjs';
import {sweptTubeVertices,renderBatches,STRIDE_FLOATS,SHAPE,ROLE,taperAt} from '../public/geometry.mjs';
import {FRAGMENT_GLSL} from '../public/optics-glsl.mjs';
const src=n=>readFileSync(new URL('../public/'+n,import.meta.url),'utf8');
const read=n=>JSON.parse(src(`data/${n}.json`));
const snapshots=['T0','T1','T2'].map(read),nav=read('navigation');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
test('Phase 2.5 only changes optical projection, retains all pinned frozen data',()=>{
 const manifest=read('manifest');
 for(const scene of snapshots){assert.equal(scene.snapshotHash,manifest.snapshots.find(x=>x.phase===scene.phase).snapshotHash);}
 assert.equal(nav.metadataLinks.length,172);
 assert.equal(mainDeclaredComponent(snapshots[1],nav).length,123);
 assert.equal(snapshots[0].nodes.length,174);
 assert.deepEqual(snapshots.map(s=>s.fibers.length),[0,12,15]);
 assert.deepEqual(snapshots.map(s=>s.pulseChambers.length),[0,7,5]);
 assert.deepEqual(snapshots.map(s=>s.propulsionCores.length),[0,0,2]);
});
test('centripetal curve interpolates all five real control positions exactly',()=>{
 for(const s of snapshots)for(const f of s.fibers){
  const old=JSON.stringify(f.points);
  for(let i=0;i<5;i++)for(let k=0;k<3;k++)assert.ok(Math.abs(curve(f.points,i/4)[k]-f.points[i][k])<1e-9);
  assert.equal(JSON.stringify(f.points),old);
 }
});
test('all activated fibers sample smoothly and retain precise source endpoints',()=>{
 for(const s of snapshots)for(const variant of ['A','B','C']){
  const g=deriveGeometry(s,variant,nav);
  for(const f of s.fibers){
   const strands=g.strands.filter(x=>x.sourceId===f.id);
   assert.ok(strands.length>0);
   for(const x of strands){
    assert.equal(x.shape,'tube');assert.ok(x.positions.length>=110);
    assert.ok(x.positions[0].every((v,i)=>Math.abs(v-f.points[0][i])<1e-8));
    assert.ok(x.positions.at(-1).every((v,i)=>Math.abs(v-f.points.at(-1)[i])<1e-8));
   }
  }
 }
});
test('tube has sealed pinched tips, no ring mouths at either end',()=>{
 const g=deriveGeometry(snapshots[1],'A',nav),s=g.strands.find(x=>x.role==='fiber');
 const mesh=sweptTubeVertices(s),rows=[];
 for(let i=0;i<mesh.length;i+=STRIDE_FLOATS)rows.push(mesh.subarray(i,i+STRIDE_FLOATS));
 const tips=[rows.filter(r=>r[15]===0),rows.filter(r=>r[15]===1)];
 for(const tip of tips){assert.ok(tip.length>=12);const p=[...tip[0].slice(0,3)];
  assert.ok(tip.every(v=>v.slice(0,3).every((k,i)=>k===p[i])), 'terminal ring must collapse to one point');}
 assert.equal(taperAt(0),0);assert.equal(taperAt(1),0);assert.ok(taperAt(.5)>.9);
 assert.equal(rows[0][17],SHAPE.tube);
});
test('tube uses twelve angular segments with finite triangle geometry',()=>{
 const s=deriveGeometry(snapshots[1],'A',nav).strands.find(x=>x.role==='fiber');
 const mesh=sweptTubeVertices(s);
 assert.equal(mesh.length/STRIDE_FLOATS,(s.positions.length-1)*12*6);
 assert.ok(mesh.every(Number.isFinite));
});
test('all T1 pulse chambers have Gaussian-only geometry, no polygon strip rays',()=>{
 const g=deriveGeometry(snapshots[1],'A',nav);
 const pulses=g.strands.filter(x=>x.role==='pulse');
 assert.equal(snapshots[1].pulseChambers.length,7);
 assert.ok(pulses.length>=21);
 assert.ok(pulses.every(x=>x.shape==='softDisc'&&x.positions.length===1));
 assert.ok(pulses.every(x=>/^pulse:\d+:/.test(x.sourceId)));
});
test('Gaussian shader is isotropic in UV with stable unwarped disc corners',()=>{
 assert.match(FRAGMENT_GLSL,/dot\(vUV,vUV\)/);
 assert.match(FRAGMENT_GLSL,/exp\(-4\.8\*r2\)/);
 assert.match(FRAGMENT_GLSL,/smoothstep\(\.72,1\.02,r\)/);
 assert.match(src('renderer-webgl2.mjs'),/aShape>1\.5\?vec3\(0\.0\)/);
 assert.match(src('renderer-three.mjs'),/aShape>1\.5\?vec3\(0\.0\)/);
});
test('native renderer paints optical layers and visible solid skin without a fragile EQUAL prepass',()=>{
 const x=src('renderer-webgl2.mjs');
 assert.match(x,/gl\.colorMask\(true,true,true,true\)/);
 assert.match(x,/gl\.disable\(gl\.DEPTH_TEST\)/);
 assert.match(x,/for\(const e of opticals\)paint\(e\)/);
 assert.match(x,/gl\.enable\(gl\.DEPTH_TEST\)/);
 assert.match(x,/gl\.depthFunc\(gl\.LEQUAL\)/);
 assert.match(x,/for\(const e of solids\)paint\(e\)/);
 assert.doesNotMatch(x,/gl\.depthFunc\(gl\.EQUAL\)/);
 assert.match(x,/opticals=ordered\.filter\(e=>!e\.solid\)/);
});
test('Three.js also paints living skin once with non-equal depth testing',()=>{
 const x=src('renderer-three.mjs');
 assert.match(x,/depthWrite:true/);
 assert.match(x,/THREE\.LessEqualDepth/);
 assert.match(x,/side:THREE\.DoubleSide/);
 assert.doesNotMatch(x,/THREE\.EqualDepth/);
 assert.match(x,/renderOrder=30/);
});
test('both shaders implement diffuse, rim translucency and matched breathing field',()=>{
 assert.match(FRAGMENT_GLSL,/float lambert=max\(0\.0,dot/);
 assert.match(FRAGMENT_GLSL,/opacity\*=1\.0-\.23\*rim/);
 for(const source of [src('renderer-three.mjs'),src('renderer-webgl2.mjs')]){
  assert.match(source,/float breathing=sin\(uTime\*\.59\+localPhase\)/);
  assert.match(source,/float secondary=sin\(uTime\*\.38\+localPhase\*\.57\+\.7\)/);
  assert.match(source,/endEnvelope\*rolePulse/);
  assert.match(source,/vNormalView=normalView/);
  assert.match(source,/Date\.now\(\)\/1000/);
 }
});
test('solid classification covers fibers, fossils and propulsion core only',()=>{
 const g=deriveGeometry(snapshots[2],'A',nav),batches=renderBatches(g);
 assert.ok(batches.some(b=>b.solid&&b.role==='fiber'));
 assert.ok(batches.some(b=>b.solid&&b.role==='core'));
 assert.ok(batches.every(b=>!b.solid||b.strands.every(s=>s.shape==='tube')));
 assert.ok(batches.filter(b=>b.role==='optical-slab').every(b=>!b.solid));
});
test('focus context and minimalist read interface are preserved',()=>{
 const app=src('app.mjs'),html=src('index.html');
 assert.match(app,/strand\.alpha\*=active\?1\.35:\.28/);
 assert.match(html,/id="settingsToggle"/);
 assert.match(html,/id="archiveToggle"/);
 assert.match(html,/body\.settings-open #settingsPanel/);
 assert.match(html,/T₀ — T₁ — T₂/);
});
test('rendering makes no changes to source records, links, or scene array bytes',()=>{
 const before=digest(Buffer.from(JSON.stringify([snapshots,nav])));
 for(const s of snapshots){deriveGeometry(s,'A',nav);deriveGeometry(s,'B',nav);deriveGeometry(s,'C',nav);}
 assert.equal(digest(Buffer.from(JSON.stringify([snapshots,nav]))),before);
});

// Regression guard for the Phase 2.5 WebGL2 blank-screen incident:
// an extra trailing `}` in the vertex GLSL caused ERROR: 0:66.
test('native vertex GLSL has balanced braces and a single main closing brace',()=>{
 const source=src('renderer-webgl2.mjs');
 const vertex=source.split('const VS=`')[1]?.split('`;')[0];
 assert.ok(vertex,'Vertex GLSL source found');
 let depth=0;for(const ch of vertex){if(ch==='{')depth++;else if(ch==='}')depth--;assert.ok(depth>=0,'Extra closing brace in vertex shader');}
 assert.equal(depth,0,'Vertex GLSL braces must balance');
 assert.match(vertex.trim(),/\}\s*$/);
});
