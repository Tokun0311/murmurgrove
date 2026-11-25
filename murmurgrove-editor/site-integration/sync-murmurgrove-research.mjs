/** Build-time source projection only. Historical T0 data never altered. */
import path from 'node:path';
import {syncGraph} from '../murmurgrove-editor/research-core.mjs';
const result=await syncGraph(path.resolve(process.cwd()));
console.log(`murmurgrove research: ${result.graph.records.length} published records, ${result.graph.relations.length} relations, changed=${result.changed}`);
