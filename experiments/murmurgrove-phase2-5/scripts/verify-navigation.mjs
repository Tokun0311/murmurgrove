/** Read-only local source route contract; does not claim deployment availability. */
import {readFileSync,existsSync} from 'node:fs';import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url)),repo=resolve(dir,'../../..');
const nav=JSON.parse(readFileSync(resolve(dir,'../public/data/navigation.json'),'utf8'));
const names={concept:'concepts',exhibition:'exhibitions',person:'people',institution:'institutions',writing:'writing'};
const failures=[];let available=0;
for(const r of nav.records){const source=resolve(repo,r.source);if(!existsSync(source)){failures.push(`Missing source: ${r.source}`);continue;}
 const folder=names[r.kind],slug=r.id.split(':')[1],expected=`/${folder}/${slug}/`;
 if(r.path!==expected)failures.push(`Route mismatch: ${r.id}`);else available++;
}
for(const folder of Object.values(names)){const route=resolve(repo,'src/pages',folder,'[slug].astro');if(!existsSync(route))failures.push(`Missing dynamic route: ${folder}`);}
console.log(JSON.stringify({status:failures.length?'FAIL_SOURCE_ROUTE':'PASS_SOURCE_ROUTE_ONLY',checked:nav.records.length,matched:available,failures,warning:'Does not validate deployed build, draft filtering or live HTTP 200 responses.'},null,2));
if(failures.length)process.exitCode=1;
