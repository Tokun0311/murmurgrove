/** Non-destructive preflight for site integration. Does not build or deploy. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildGraph,readEvents,readConceptMeta} from './research-core.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const exists=async p=>fs.access(path.join(root,p)).then(()=>true,()=>false);
let errors=0;function check(ok,message){console.log((ok?'PASS ':'FAIL ')+message);if(!ok)errors++}
const required=['src/content.config.ts','src/data/exhibitions','public/murmurgrove/organism/data/T0.json','public/murmurgrove/organism/data/manifest.json','murmurgrove-editor/.gitignore'];
for(const r of required)check(await exists(r),r);
const hooks=['public/murmurgrove/organism/research-current-overlay.mjs','src/pages/research/index.astro','scripts/sync-murmurgrove-research.mjs','src/components/ResearchConnections.astro','src/components/ResearchConceptMemory.astro','src/pages/writing/index.astro','src/pages/writing/[slug].astro'];
for(const r of hooks)check(await exists(r),'Optional site integration: '+r);
if(await exists('package.json')){
 const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
 check(Boolean(pkg.scripts?.build?.includes('sync-murmurgrove-research.mjs')),'Astro build integrates source-index generator');
}
if(await exists('public/murmurgrove/organism/index.html')){
 const html=await fs.readFile(path.join(root,'public/murmurgrove/organism/index.html'),'utf8');
 check(html.includes('research-current-overlay.mjs'),'Safe current optical overlay is embedded');
}
try{const graph=await buildGraph(root);await readEvents(root);await readConceptMeta(root);
 console.log(`Indexed ${graph.records.length} published records; ${graph.relations.length} source-backed links; ${graph.claims.length} reviewed claims.`);
 if(await exists('public/murmurgrove/research/current.json')){
  const published=JSON.parse(await fs.readFile(path.join(root,'public/murmurgrove/research/current.json'),'utf8'));
  check(published.graphHash===graph.graphHash,'Published source index matches current archive');
 }else check(false,'Current source index missing: run node scripts/sync-murmurgrove-research.mjs');
}catch(e){console.error('Research verification stopped:',e.message);errors++}
console.log('\nHistorical T0, manifest, lived events and chronicle are read-only. Private Word originals are outside Git.');
console.log('This check cannot verify Cloudflare deployment, public Git history, or semantic correctness of AI interpretations.');
process.exitCode=errors?1:0;
