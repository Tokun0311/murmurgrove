import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deriveDensityMatrix,deriveGeometry} from '../public/adapter.mjs';
import {contextFor,locatorData,locatorSVG,selectionSourceIds} from '../public/situated-reading.mjs';
const root=new URL('../public/data/',import.meta.url);
const read=name=>JSON.parse(readFileSync(new URL(name+'.json',root),'utf8'));
const scene=read('T1'),nav=read('navigation');
const camera={azimuth:.7,elevation:.23,zoom:3,target:[0,0,0]};
test('density matrix derives local strands without changing the snapshot',()=>{
 const before=JSON.stringify(scene),strands=deriveDensityMatrix(scene);
 assert.ok(strands.length>0);assert.equal(JSON.stringify(scene),before);
 assert.ok(strands.every(s=>s.sourceId.startsWith('matrix:')));
});
test('matrix only derives from real snapshot nodes',()=>{
 const ids=new Set(scene.nodes.map(n=>n.id));
 assert.ok(deriveDensityMatrix(scene).every(s=>ids.has(s.sourceId.slice(7))));
});
test('isolated spatial sample never generates a fake bridge',()=>{
 const x={nodes:[{id:'concept:printmaking',displayPosition:[20,20,20]}]};
 assert.deepEqual(deriveDensityMatrix(x),[]);
});
test('shared geometry retains snapshot fingerprint across variants',()=>{
 for(const v of ['A','B','C'])assert.equal(deriveGeometry(scene,v).snapshotHash,scene.snapshotHash);
});
test('locator projection depends on current camera',()=>{
 const x=locatorData(scene,camera,{kind:'record',id:scene.nodes[0].id},nav);
 assert.equal(x.points.length,scene.nodes.length);assert.ok(x.selected);
 assert.notDeepEqual(x.points,locatorData(scene,{...camera,azimuth:1.5},null,nav).points);
});
test('locator displays selection and camera target separately',()=>{
 const x=locatorSVG(locatorData(scene,camera,{kind:'record',id:scene.nodes[0].id},nav));
 assert.match(x,/CAMERA 300%/);assert.match(x,/整体身体定位图/);assert.match(x,/#4e7d6e/);
});
test('metadata and simulated fiber remain distinct reading statuses',()=>{
 const meta=contextFor({kind:'metadata',id:'metadata:a|b'},nav,scene);
 const fiber=contextFor({kind:'fiber',id:'simulated'},nav,scene);
 assert.match(meta.status,/未激活/);assert.match(fiber.status,/已激活/);
});
test('quarantined record is identified as needs-review',()=>{
 const r=nav.records.find(r=>r.quarantined);assert.ok(r);
 assert.match(contextFor({kind:'record',id:r.id},nav,scene).status,/待核实/);
});
test('selection derives read-only source ids',()=>{
 assert.deepEqual(selectionSourceIds({kind:'metadata',id:'metadata:concept:a|person:b'},scene),['concept:a','person:b']);
});
