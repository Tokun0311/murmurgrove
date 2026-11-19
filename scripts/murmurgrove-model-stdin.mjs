/** Canonical V6 morphology computation for the snapshot job.
 * Node >= 22.19: --experimental-strip-types supports the same TS code as Astro.
 */
import { createMurmurgrove } from '../src/lib/murmurgrove.ts';
let payload='';
for await (const chunk of process.stdin) payload+=chunk;
const data=JSON.parse(payload);
const result=createMurmurgrove(data);
process.stdout.write(JSON.stringify(result));
