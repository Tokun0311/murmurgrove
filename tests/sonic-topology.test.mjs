/** Run: node --experimental-strip-types tests/sonic-topology.test.mjs */
import assert from 'node:assert/strict';
import {sonicGraph,compareSonicGraphs} from '../src/lib/murmurgrove-sonic-structure.ts';
const e=(a,b,w=1,kind='direct')=>({from:a,to:b,weight:w,kind});
const A=[
  e('exhibitions:a','people:b'),e('people:b','institutions:c'),
  e('institutions:c','concepts:d'),e('concepts:d','exhibitions:e')
];
const AReordered=[...A].reverse().map(edge=>({...edge,from:edge.to,to:edge.from}));
const B=[
  e('exhibitions:a','people:b'),e('people:b','institutions:c'),
  e('concepts:d','exhibitions:e'),e('institutions:c','concepts:d')
];
const C=[
  e('exhibitions:a','people:b'),e('people:b','institutions:c'),
  e('concepts:d','exhibitions:e'),e('concepts:d','institutions:f')
];
// Topology independent of the order of content files or root orientation.
assert.deepEqual(sonicGraph(A),sonicGraph(AReordered));
assert.equal(compareSonicGraphs(A,AReordered).changed,false);
// A and C have identical edge totals; a different graph must affect sonic topology.
assert.equal(A.length,C.length);
assert.notEqual(sonicGraph(A).signature,sonicGraph(C).signature);
assert.notEqual(sonicGraph(A).integration,sonicGraph(C).integration);
const transition=compareSonicGraphs(A,C);
assert.equal(transition.added,1);
assert.equal(transition.removed,1);
assert.equal(transition.changed,true);
// Same relationships, but higher shared reinforcement changes sound-affecting graph data.
const D=A.map((edge,i)=>i===0?{...edge,weight:3,kind:'shared'}:edge);
assert.ok(sonicGraph(D).reinforcement>sonicGraph(A).reinforcement);
assert.notEqual(sonicGraph(D).signature,sonicGraph(A).signature);
assert.equal(compareSonicGraphs(A,D).reweighted,1);
assert.equal(compareSonicGraphs(A,D).changed,true);
// This module does not map raw count to amplitude or frequency.
assert.ok(!('volume' in sonicGraph(A)));
console.log('PASS: 6 sonic topology invariants, including same-edge-count different-relation response.');
