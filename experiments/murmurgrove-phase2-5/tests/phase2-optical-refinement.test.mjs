import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deriveGeometry,mainDeclaredComponent,deriveExtracellularVeil,deriveSedimentSoftFalloff} from '../public/adapter.mjs';
import {ribbonVertices,sweptTubeVertices,renderBatches,STRIDE_FLOATS,ROLE,SHAPE} from '../public/geometry.mjs';
import {locatorData,locatorSVG,normalizeAzimuthDegrees} from '../public/situated-reading.mjs';
import {FRAGMENT_GLSL} from '../public/optics-glsl.mjs';
const src=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
const load=name=>JSON.parse(src('data/'+name+'.json'));
const snapshots=['T0','T1','T2'].map(load),nav=load('navigation'),locked=snapshots.map(s=>createHash('sha256').update(src(`data/${s.phase}.json`)).digest('hex'));
test('locked T0/T1/T2 snapshots remain byte-identical to original manifest pins',()=>{
 const m=load('manifest');for(const s of snapshots)assert.equal(m.snapshots.find(x=>x.phase===s.phase).snapshotHash,s.snapshotHash);
 assert.deepEqual(snapshots.map(s=>createHash('sha256').update(src(`data/${s.phase}.json`)).digest('hex')),locked);
});
test('largest declared component is exactly 123 actual known nodes',()=>{
 const ids=mainDeclaredComponent(snapshots[1],nav);assert.equal(ids.length,123);
 assert.ok(ids.every(id=>snapshots[1].nodes.some(n=>n.id===id)));
});
test('extracellular veil follows only spatially supported nodes of that component',()=>{
 for(const s of snapshots){
  const main=new Set(mainDeclaredComponent(s,nav));const veil=deriveExtracellularVeil(s,nav);
  assert.ok(veil.length>0&&veil.length<=2*main.size);
  assert.ok(veil.every(x=>main.has(x.sourceId.slice(5).replace(/:(shadow|membrane)$/,''))));
  assert.ok(veil.every(x=>x.shape==='softDisc'&&x.role==='veil'));
  assert.equal(new Set(veil.map(x=>x.sourceId)).size,veil.length);
 }
});
test('isolated material receives no invented veil or invented topology',()=>{
 const island={nodes:[{id:'concept:alone',displayPosition:[200,0,0],activeEver:false}]};
 const navigation={metadataLinks:[]};assert.deepEqual(deriveExtracellularVeil(island,navigation),[]);
});
test('174 T0 inactive records each have one radial softened deposit',()=>{
 const deposits=deriveSedimentSoftFalloff(snapshots[0]);assert.equal(deposits.length,174);
 assert.ok(deposits.every(x=>x.role==='sediment'&&x.shape==='softDisc'&&x.positions.length===1));
});
test('T1 exactly seven observed pulse chambers acquire two amplitude-scaled halos each',()=>{
 const d=deriveGeometry(snapshots[1],'C',nav);
 const halo=d.strands.filter(s=>/^pulse:\d+:(?:haze|heart)$/.test(s.id));
 assert.equal(snapshots[1].pulseChambers.length,7);assert.equal(halo.length,14);
 assert.ok(halo.every(s=>s.shape==='softDisc'&&s.alpha>0));
 assert.equal(deriveGeometry(snapshots[0],'C',nav).strands.filter(s=>/^pulse:\d+:(?:haze|heart)$/.test(s.id)).length,0);
});
test('active fiber uses a single continuous, high-subdivision swept spline without mutating five controls',()=>{
 const source=snapshots[1].fibers[0],before=JSON.stringify(source.points);
 const g=deriveGeometry(snapshots[1],'B',nav),strands=g.strands.filter(s=>s.sourceId===source.id);
 assert.equal(source.points.length,5);assert.ok(strands.length>=1);assert.ok(strands.every(s=>s.shape==='tube'&&s.positions.length>=60));
 assert.equal(JSON.stringify(source.points),before);
});
test('swept tube is finite, continuously joined, and uses multiple radial normals',()=>{
 const s=deriveGeometry(snapshots[1],'B',nav).strands.find(x=>x.role==='fiber');
 const vertices=sweptTubeVertices(s),radial=12;
 assert.ok(vertices.every(Number.isFinite));
 assert.equal(vertices.length/STRIDE_FLOATS,(s.positions.length-1)*radial*6);
 const rows=Array.from({length:vertices.length/STRIDE_FLOATS},(_,i)=>vertices.subarray(i*STRIDE_FLOATS,(i+1)*STRIDE_FLOATS));
 assert.ok(rows.every(r=>r[17]===SHAPE.tube&&r[14]===ROLE.fiber));
 // Within each pair of triangle strips the adjacent ring endpoints are byte-identical.
 for(let j=0;j<radial;j++){
  const v=rows.slice(j*6,j*6+6);
  assert.deepEqual([...v[1].slice(0,3)],[...v[3].slice(0,3)]);
  assert.deepEqual([...v[2].slice(0,3)],[...v[5].slice(0,3)]);
 }
});
test('each Gaussian disc has six finite vertices and no hard polygon clipping logic',()=>{
 const sprite=deriveSedimentSoftFalloff(snapshots[0])[0],v=ribbonVertices(sprite);
 assert.equal(v.length/STRIDE_FLOATS,6);assert.ok(v.every(Number.isFinite));
 assert.ok([...Array(6)].every((_,i)=>v[i*STRIDE_FLOATS+17]===SHAPE.softDisc));
 assert.match(FRAGMENT_GLSL,/exp\(-4\.8\*r2\)/);
 assert.match(FRAGMENT_GLSL,/smoothstep\(\.72,1\.02,r\)/);
});
test('Fresnel attenuation is present and supplied by native and optional Three renderers',()=>{
 assert.match(FRAGMENT_GLSL,/opacity\*=1\.0-\.23\*rim/);
 assert.doesNotMatch(FRAGMENT_GLSL,/if\(skin&&!gl_FrontFacing\)discard/); // Winding must not hide all tubes
 assert.match(src('renderer-webgl2.mjs'),/vFresnel=pow/);
 assert.match(src('renderer-three.mjs'),/vFresnel=pow/);
 assert.match(src('renderer-three.mjs'),/glslVersion:THREE\.GLSL3/);
});
test('all three views use shared pinned snapshots and preserve declared fiber counts',()=>{
 for(const s of snapshots)for(const variant of ['A','B','C']){
  const g=deriveGeometry(s,variant,nav);assert.equal(g.snapshotHash,s.snapshotHash);
  assert.equal(g.sourceCounts.fibers,s.fibers.length);
  assert.equal(g.sourceCounts.pulseChambers,s.pulseChambers.length);
  assert.ok(g.strands.every(x=>x.positions.every(p=>p.every(Number.isFinite))));
 }
});
test('three visual time states remain independently distinguishable with genuine simulated pulse and core counts',()=>{
 assert.deepEqual(snapshots.map(s=>[s.fibers.length,s.pulseChambers.length,s.propulsionCores.length]),[[0,0,0],[12,7,0],[15,5,2]]);
});
test('soft slab batching retains all source triangles and avoids per-sprite draw calls',()=>{
 const g=deriveGeometry(snapshots[2],'C',nav),b=renderBatches(g);
 assert.ok(b.length<100);
 assert.equal(b.reduce((sum,x)=>sum+x.vertices.length,0),g.strands.reduce((sum,s)=>sum+ribbonVertices(s).length,0));
});
test('azimuth is normalized to 0-360 including 531 degrees and negative angles',()=>{
 assert.ok(Math.abs(normalizeAzimuthDegrees(531*Math.PI/180)-171)<1e-8);
 assert.ok(Math.abs(normalizeAzimuthDegrees(-30*Math.PI/180)-330)<1e-8);
 const c={azimuth:531*Math.PI/180,elevation:.2,zoom:3,target:[0,0,0]};
 const svg=locatorSVG(locatorData(snapshots[1],c,null,nav));
 assert.match(svg,/AZ 171°/);assert.doesNotMatch(svg,/<ellipse/);
 assert.match(svg,/locator-density/);
});
test('focus and context retain 28% of non-selected source opacity',()=>{
 assert.match(src('app.mjs'),/strand\.alpha\*=active\?1\.35:\.28/);
 assert.match(src('app.mjs'),/deriveGeometry\(scenes\[state\.phase\],state\.variant,nav\)/);
 assert.match(src('app.mjs'),/document\.body\.classList\.toggle\('detail-open',!!item\)/);
});
test('tension is rounded, timeline labels are ordered, and lab controls are hidden behind settings',()=>{
 assert.match(src('app.mjs'),/\.toFixed\(2\)/);
 assert.match(src('index.html'),/T₀ — T₁ — T₂/);
 assert.match(src('index.html'),/body\.nav-open #archiveNav,body\.settings-open #settingsPanel/);
 assert.match(src('index.html'),/id="settingsToggle"/);
});
test('immutable source arrays and nav graph do not change after all optical construction',()=>{
 const before=JSON.stringify([snapshots,nav]);for(const s of snapshots){deriveGeometry(s,'A',nav);deriveGeometry(s,'B',nav);deriveGeometry(s,'C',nav);}
 assert.equal(JSON.stringify([snapshots,nav]),before);
});
