/** Optional additive integration with an EXISTING rebranded site. Dry-run by default. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'..');
const APPLY=process.argv.includes('--apply');
const has=async p=>fs.access(p).then(()=>true,()=>false);
const src=path.join(dir,'site-integration');
const pkg=path.join(root,'package.json'),index=path.join(root,'public/murmurgrove/organism/index.html'),viewer=path.join(root,'public/murmurgrove/organism/viewer.mjs');
if(!await has(pkg)||!await has(index)||!await has(viewer)||!await has(path.join(root,'src/layouts/Base.astro')))throw Error('Not inside a compatible existing Astro site. Nothing changed.');
const original=await fs.readFile(index,'utf8');
const embed='<script type="module" src="./research-current-overlay.mjs"></script>';
if(!original.includes('</body>')||!original.includes('viewer.mjs'))throw Error('Unrecognized organism entry: refused to patch');
const originalPkg=JSON.parse(await fs.readFile(pkg,'utf8'));
if(!originalPkg.scripts?.build||!originalPkg.scripts.build.includes('astro build'))throw Error('Unrecognized build command: refused to modify');
const articleTypes=['exhibitions','people','institutions','concepts'];
const articlePaths=articleTypes.map(t=>path.join(root,'src/pages',t,'[slug].astro'));
const actions=[
 ['ADD','public/murmurgrove/organism/research-current-overlay.mjs'],
 ['ADD','public/murmurgrove/research/explore.js'],
 ['ADD','src/pages/research/index.astro'],
 [await has(path.join(root,'src/pages/writing/index.astro'))?'SKIP':'ADD','src/pages/writing/index.astro'],
 [await has(path.join(root,'src/pages/writing/[slug].astro'))?'SKIP':'ADD','src/pages/writing/[slug].astro'],
 ['ADD','scripts/sync-murmurgrove-research.mjs'],
 ['ADD','src/components/ResearchConnections.astro'],
 ['ADD','src/components/ResearchConceptMemory.astro'],
 [original.includes(embed)?'SKIP':'PATCH','public/murmurgrove/organism/index.html'],
 ...articleTypes.map((t,i)=>['PATCH','src/pages/'+t+'/[slug].astro']),
 [originalPkg.scripts.build.includes('sync-murmurgrove-research.mjs')?'SKIP':'PATCH','package.json']
];
console.log(`murmurgrove site integration (${APPLY?'APPLY':'DRY RUN'})`);for(const x of actions)console.log(x.join('  '));
if(!APPLY){console.log('Nothing changed. Run node murmurgrove-editor/install-site.mjs --apply after Git commit/backup.');process.exit(0)}
const backup=path.join(dir,'.private','site-integration-backup',new Date().toISOString().replace(/[:.]/g,'-'));
const copy=async(from,to)=>{await fs.mkdir(path.dirname(to),{recursive:true});if(await has(to)){const old=await fs.readFile(to);const next=await fs.readFile(from);if(!old.equals(next))throw Error('Refusing to replace an existing custom integration file: '+to);return;}await fs.copyFile(from,to);};
// Refuse preexisting unrelated routes and scripts before any modifications.
for(const [,file] of actions.filter(([kind])=>kind==='ADD')){const dest=path.join(root,file),name=path.basename(file);const filename=file==='src/pages/research/index.astro'?'research.astro':file==='src/pages/writing/index.astro'?'WritingReaderIndex.astro':file==='src/pages/writing/[slug].astro'?'WritingReaderRecord.astro':name;
 if(await has(dest)){const existing=await fs.readFile(dest);const incoming=await fs.readFile(path.join(src,filename));if(!existing.equals(incoming))throw Error('Conflicting site file: '+file+'; no changes applied');}}
await fs.mkdir(backup,{recursive:true});for(const file of [pkg,index,...articlePaths.filter(Boolean)])if(await has(file))await fs.copyFile(file,path.join(backup,path.relative(root,file).replaceAll(/[\\/]/g,'__')));
for(const [,file] of actions.filter(([kind])=>kind==='ADD')){
 const name=path.basename(file),filename=file==='src/pages/research/index.astro'?'research.astro':file==='src/pages/writing/index.astro'?'WritingReaderIndex.astro':file==='src/pages/writing/[slug].astro'?'WritingReaderRecord.astro':name;await copy(path.join(src,filename),path.join(root,file));
}
if(!original.includes(embed))await fs.writeFile(index,original.replace('</body>',embed+'</body>'));
for(let i=0;i<articleTypes.length;i++){
 const t=articleTypes[i],file=articlePaths[i];if(!await has(file)){console.log('SKIP missing article route',t);continue}
 let page=await fs.readFile(file,'utf8');if(!page.includes('<ResearchConnections') && page.includes('</article>') && page.includes("import Base from '../../layouts/Base.astro';")){
  page=page.replace("import Base from '../../layouts/Base.astro';", "import Base from '../../layouts/Base.astro';\nimport ResearchConnections from '../../components/ResearchConnections.astro';");
  page=page.replace('</article>',`<ResearchConnections kind="${t}" id={item.id} /></article>`);
  await fs.writeFile(file,page);console.log('Added reviewed source links:',t);
 }
 if(t==='concepts'){
  const text=await fs.readFile(file,'utf8');
  if(!text.includes('<ResearchConceptMemory')&&text.includes('<div class="prose"><Content/></div>')&&text.includes("import Base from '../../layouts/Base.astro';")){
   const next=text.replace("import Base from '../../layouts/Base.astro';", "import Base from '../../layouts/Base.astro';\nimport ResearchConceptMemory from '../../components/ResearchConceptMemory.astro';").replace('<div class="prose"><Content/></div>','<div class="prose"><Content/></div><ResearchConceptMemory id={item.id} />');
   await fs.writeFile(file,next);console.log('Added Concept Definition / Interpretation / Development view');
  }
 }
 if(t==='exhibitions'){
  const latest=await fs.readFile(file,'utf8');
  const old="{item.data.dateLabel.replaceAll('-','.')}.2026";
  if(latest.includes(old)){await fs.writeFile(file,latest.replace(old,"{item.data.visitedOn.toISOString().slice(0,10)}"));console.log('Fixed non-2026 visit dates');}
 }
}

if(!originalPkg.scripts.build.includes('sync-murmurgrove-research.mjs')){
 originalPkg.scripts.build='node scripts/sync-murmurgrove-research.mjs && '+originalPkg.scripts.build;
 await fs.writeFile(pkg,JSON.stringify(originalPkg,null,2)+'\n');
}
console.log(`Integration installed. Original package.json and organism HTML backed up privately: ${backup}`);
console.log('Next: node murmurgrove-editor/verify-install.mjs, then npm run build. Check Git diff before Push.');
