import fs from 'node:fs';
import {simulateMorphology,metrics,seedPoint,MODEL_VERSION} from '../src/dynamics.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../fixtures/synthetic-events.json',import.meta.url),'utf8'));
const checks=[
  ['2027 Lived (no backfill)', '2027-12-31T23:59:59Z'],
  ['2030 after encounter', '2030-01-11T00:00:00Z'],
  ['2036 before reinterpretation', '2036-07-20T11:01:59Z'],
  ['2036 after reinterpretation', '2036-07-21T00:00:00Z'],
  ['2037 after fact correction', '2037-03-02T08:00:00Z'],
];
console.log('MODEL:',MODEL_VERSION);
console.log('ALL DATA IN THIS DEMO ARE SYNTHETIC. Not a simulation of the user\'s actual research.');
for(const [label,at] of checks) {
  const state=simulateMorphology(fixture,{asOf:at});
  const m=metrics(state);
  const concept=state.nodes.find(n=>n.id==='concept:site-specificity');
  const oldFiber=state.fibers.find(f=>f.id==='link:exhibition-site');
  console.log(`\n${label} | ${at}`);
  console.log(`  records=${m.nodeCount} activeFibers=${m.activeFiberCount} lifeEvents=${m.lifeEventCount} branches=${m.branchCount}`);
  if(concept) console.log(`  Concept P0: ${JSON.stringify(concept.seed)} P: ${JSON.stringify(concept.position)} | A=${concept.activity.toFixed(5)} L=${concept.lignification.toFixed(5)} scars=${concept.scarFactor.toFixed(2)}`);
  if(oldFiber) console.log(`  Old fiber tension=${oldFiber.tension.toFixed(5)}, L=${oldFiber.lignification.toFixed(5)}, sediment=${oldFiber.fossilLayers.length}`);
  if(state.branches.length) console.log(`  New branch bend angle=${state.branches[0].angleDegrees.toFixed(2)}° (from previously fossilized path)`);
  console.log(`  hash=${state.morphologyHash.slice(0,24)}...`);
}
