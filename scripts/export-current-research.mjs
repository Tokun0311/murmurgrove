import {buildGraph} from '../murmurgrove-editor/research-core.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const graph=await buildGraph(process.cwd());
const dir=path.join(process.cwd(),'dist','murmurgrove','research');
await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'current.json'),JSON.stringify(graph,null,2)+'\n');
console.log(`Current research projection: ${graph.records.length} records, ${graph.relations.length} current relations (no source or history writes)`);
