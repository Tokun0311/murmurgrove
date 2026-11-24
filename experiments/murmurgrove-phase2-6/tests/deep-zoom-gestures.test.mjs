import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {viewDrag,calmMagnifiedMotion} from '../public/camera-gestures.mjs';
import {panForCursorZoom} from '../public/organic-interaction.mjs';

const viewer=readFileSync(new URL('../public/viewer.mjs',import.meta.url),'utf8');
const file=name=>readFileSync(new URL('../public/data/'+name+'.json',import.meta.url));
const frozen={
 'T0':'6d83b426de74ed737e0feb944fcc6266d0033c2a386ff9f19cc9cc32d173a16a',
 'known-data-baseline.v1':'50c22ba7f38deb2109727040691638db94a6ec3344a9ccf0e3f2c39cec457651',
 'navigation':'4c8c2195992779d4b1a085defae904cafddd4a466cddb85a7f0661fa0a84aa3f',
 'manifest':'ca2758ecfd7e12eed478f6baec8a34012ed05fc261c06c832d57441c97ef3fd6'
};
test('all four frozen source JSON files retain their exact SHA-256',()=>{
 for(const [name,sha] of Object.entries(frozen))assert.equal(createHash('sha256').update(file(name)).digest('hex'),sha);
});
test('drag at 200%-2400% pans image one screen pixel per pointer pixel without rotating',()=>{
 for(const z of [1.01,2,6,10,24]){
  const start={position:[130,140],pan:[80,-100],angle:.63,elevation:.20};
  const p=viewDrag(start,[210,180],{zoom:z});
  assert.deepEqual(p,{kind:'pan',pan:[160,-60],angle:.63,elevation:.20});
  assert.deepEqual(start.pan,[80,-100]);
 }
});
test('overview drag rotates; deep Shift+drag rotates deliberately',()=>{
 const start={position:[130,140],pan:[80,-100],angle:.63,elevation:.20};
 for(const [zoom,shift] of [[.65,false],[1,false],[12,true]]){
  const value=viewDrag(start,[210,180],{zoom,shift});
  assert.equal(value.kind,'rotate');assert.deepEqual(value.pan,[80,-100]);
  assert.ok(value.angle>.63&&value.elevation>.20);
 }
});
test('gentle magnified motion retains identity/time motion while controlling screen-space excursions',()=>{
 const rest=[150,300,1],motion=[205,335,1.02];
 assert.deepEqual(calmMagnifiedMotion(rest,motion,.65),motion);
 assert.deepEqual(calmMagnifiedMotion(rest,motion,1.6),motion);
 for(const zoom of [2.1,6,12,24]){
  const result=calmMagnifiedMotion(rest,motion,zoom);
  assert.ok(result.every(Number.isFinite));
  assert.ok(Math.hypot(result[0]-rest[0],result[1]-rest[1])<22);
  assert.ok(result[0]>rest[0]&&result[1]>rest[1]);
  assert.equal(result[2],motion[2]);
 }
});
test('pointer-anchored zoom remains numerically exact and zoom home uses easing',()=>{
 const center=[195,410],pointer=[290,200],oldPan=[17,-9],next=panForCursorZoom(oldPan,2.5,12,pointer,center);
 for(const i of [0,1]){
  const x=(pointer[i]-center[i]-oldPan[i])/2.5;
  assert.ok(Math.abs(center[i]+next[i]+12*x-pointer[i])<1e-8);
 }
 assert.match(viewer,/if\(zoom<=1\)\{followSelected=false;pan=easePanHome\(pan,dt\);\}/);
});
test('only genuine particle selection enables automatic follow; manual navigation breaks it',()=>{
 assert.match(viewer,/function selectAndFollow\(id/);
 assert.match(viewer,/followSelected=zoom>1;saveMemory\(\);/);
 assert.match(viewer,/gesture\.moved=true;\s*followSelected=false/);
 assert.match(viewer,/canvas\.addEventListener\('wheel',[\s\S]*?followSelected=false/);
 assert.match(viewer,/canvas\.addEventListener\('dblclick',[\s\S]*?followSelected=false/);
 assert.match(viewer,/followSelected=false;setZoom\(zoom\*d\/pinchDist,midpoint\)/);
 assert.doesNotMatch(viewer,/else if\(selected\)followSelected=true/);
});
test('free hover does not move camera and explicit gestures are pointer-id guarded',()=>{
 assert.match(viewer,/lastPointer=pointerHere\(e\); \/\/ Hover alone never changes the camera/);
 assert.match(viewer,/if\(!gesture\|\|e\.pointerId!==gesture\.pointerId\)return/);
 assert.match(viewer,/const next=viewDrag\(gesture,\[e\.clientX,e\.clientY\]/);
 assert.match(viewer,/if\(next\.kind==='pan'\)\{pan=next\.pan;\}else\{angle=next\.angle;elevation=next\.elevation;\}/);
});
test('buttons zoom about the selected archive location, never a stale cursor location',()=>{
 assert.match(viewer,/function controlAnchor\(\)/);
 assert.match(viewer,/setZoom\(zoom\/1\.35,controlAnchor\(\)\)/);
 assert.match(viewer,/setZoom\(zoom\*1\.35,controlAnchor\(\)\)/);
});
