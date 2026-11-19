import fs from 'node:fs';
import {replay} from '../src/protocol.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../fixtures/synthetic-events.json',import.meta.url),'utf8'));
for(const [name,asOf] of [
  ['2027 lived history','2027-12-31T23:59:59Z'],
  ['2030 late ingest','2030-01-11T00:00:00Z'],
  ['2036 reinterpretation','2036-07-21T00:00:00Z'],
  ['2037 corrected present',null]
]){
 const p=replay(data,{asOf});
 console.log(`${name.padEnd(25)} records=${p.records.length} links=${p.links.length} life=${p.lifeEvents.length}  hash=${p.hash.slice(0,12)}`);
}
