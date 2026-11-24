import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {EMERALD} from '../public/emerald-palette.mjs';
const here=new URL('../public/',import.meta.url);
const read=(path)=>readFileSync(new URL(path,here));
const source=read('viewer.mjs').toString();
const sha=(name)=>createHash('sha256').update(read('data/'+name+'.json')).digest('hex');
const pinned=Object.freeze({
  T0:'6d83b426de74ed737e0feb944fcc6266d0033c2a386ff9f19cc9cc32d173a16a',
  'known-data-baseline.v1':'50c22ba7f38deb2109727040691638db94a6ec3344a9ccf0e3f2c39cec457651',
  navigation:'4c8c2195992779d4b1a085defae904cafddd4a466cddb85a7f0661fa0a84aa3f',
  manifest:'ca2758ecfd7e12eed478f6baec8a34012ed05fc261c06c832d57441c97ef3fd6'
});
const hexRGB=(color)=>color.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16));
const rgb=(color)=>color.split(',').map(Number);
test('all visualization colors belong to a coordinated green family',()=>{
 for(const [name,value] of Object.entries(EMERALD.roles)){
  assert.match(value,/^#[0-9a-f]{6}$/i,`invalid ${name}`);
  const [r,g,b]=hexRGB(value);assert.ok(g>r&&g>b,`${name} is not green-oriented`);
 }
 for(const group of [EMERALD.veil,EMERALD.traces,EMERALD.glows,EMERALD.nodes]){
  for(const [name,value] of Object.entries(group)){
   const [r,g,b]=rgb(value);assert.ok([r,g,b].every(v=>v>=0&&v<=255),name);
   assert.ok(g>r&&g>b,`${name} is not green-oriented`);
  }
 }
});
test('exhibition accents stay brighter than archival substrate; Writing stays deep emerald',()=>{
 const [wr,wg,wb]=hexRGB(EMERALD.roles.writing),[er,eg,eb]=hexRGB(EMERALD.roles.exhibition);
 assert.ok(wg<eg&&wr<er&&wb<eb);
 assert.notEqual(EMERALD.glows.observation,EMERALD.glows.sediment);
});
test('viewer consumes palette across all six rendering families',()=>{
 for(const name of ['veil.center','veil.mid','veil.edge','traces.aged','traces.living','traces.particle',
  'glows.sediment','glows.observation','glows.observationCore','glows.localPulse',
  'nodes.concept','nodes.exhibition','nodes.writing','nodes.person','nodes.institution','nodes.selected'])
  assert.ok(source.includes('EMERALD.'+name),name);
 assert.doesNotMatch(source,/#174b57|#ba9865|rgba\(212,166,101|rgba\(115,104,89/);
});
test('all four frozen source data files remain byte-identical to Phase 2.6.1',()=>{
 for(const [name,hash] of Object.entries(pinned))assert.equal(sha(name),hash,name);
});
test('real topology and biological truth checks stay unchanged by the color layer',()=>{
 const nav=JSON.parse(read('data/navigation.json'));
 const s=JSON.parse(read('data/T0.json'));
 const ids=new Set(s.nodes.map(n=>n.id));
 assert.equal(nav.metadataLinks.filter(l=>ids.has(l.from)&&ids.has(l.to)&&!l.activated).length,158);
 assert.equal(s.fibers.length,0);
 assert.equal(s.propulsionCores.length,0);
 assert.equal(s.pulseChambers.length,0);
 assert.match(source,/Math\.exp\(-days\/TAU\)/);
 assert.match(source,/panForCursorZoom/);
 assert.match(source,/mangroveControls/);
});
