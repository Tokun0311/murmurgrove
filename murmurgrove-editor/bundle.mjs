// MURMURGROVE_EDITOR_V16
// MURMURGROVE_EDITOR_V15
// Exhibition-first bundle publication. No network, no Git, no organism-history writes.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const groups={artists:'people',institution:'institutions',relatedInstitutions:'institutions',concepts:'concepts'};
const types=new Set(Object.values(groups));
const slugOk=s=>typeof s==='string'&&s.length<=100&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');
const fail=(message,status=422)=>Object.assign(new Error(message),{status});
const read=async p=>{try{return await fs.readFile(p)}catch(e){if(e.code==='ENOENT')return null;throw e}};
const names=async p=>{try{return await fs.readdir(p,{withFileTypes:true})}catch(e){if(e.code==='ENOENT')return [];throw e}};
const refs=f=>Object.entries(groups).flatMap(([field,type])=>(Array.isArray(f[field])?f[field]:f[field]?[f[field]]:[]).map(slug=>({type,slug})));
export function cleanBundle(input){
 if(input==null)return [];
 if(!Array.isArray(input)||input.length>200)throw fail('At most 200 new linked records per exhibition.');
 const seen=new Set();return input.map(n=>{
  if(!n||!types.has(n.type)||!slugOk(n.slug))throw fail('Invalid linked record ID or type.');
  const key=n.type+':'+n.slug;if(seen.has(key))throw fail('Duplicate linked ID: '+key);seen.add(key);
  if(typeof n.name!=='string'||!n.name.trim()||n.name.length>300||typeof n.body!=='string'||n.body.length>100000)throw fail('A linked record needs a name and valid text.');
  if(n.type==='institutions'&&n.city!=null&&(typeof n.city!=='string'||n.city.length>120||/[\r\n]/.test(n.city)))throw fail('Invalid institution city.');
  return {type:n.type,slug:n.slug,name:n.name.trim(),body:n.body,...(n.type==='institutions'?{city:String(n.city||'').trim()}:{}),kind:['artist','collective','curator','writer','other'].includes(n.kind)?n.kind:'other',reviewed:n.reviewed===true};
 });
}
async function snapshotTree(dir){const map=new Map();async function walk(p){for(const ent of await names(p)){const q=path.join(p,ent.name);if(ent.isSymbolicLink())throw fail('Unexpected symlink in research output; publication stopped.');if(ent.isDirectory())await walk(q);else if(ent.isFile())map.set(q,await fs.readFile(q));}}await walk(dir);return map;}
async function restoreTree(dir,before,saveAtomic){const now=await snapshotTree(dir);for(const f of now.keys())if(!before.has(f))await fs.rm(f,{force:true});for(const [f,bytes] of before)if(!now.get(f)?.equals(bytes))await saveAtomic(f,bytes);}
function variants(row){const f=row.fields||{};return [row.title,row.slug,f.name,f.title,f.sortName,f.reading,...(Array.isArray(f.aliases)?f.aliases:[]),...(Array.isArray(f.alternativeNames)?f.alternativeNames:[])].map(norm).filter(Boolean);}
export async function publishBundle(p,c){
 const {root,privateDir,draftDir,backupDir,normalise,getPaths,recordList,readCatalog,readConceptMeta,renderMd,saveAtomic,syncGraph,sha,exists}=c;
 if(p.type!=='exhibitions'||p.confirmPublic!==true||!slugOk(p.slug))throw fail('Confirm the Exhibition and every new linked record for publication.');
 const nodes=cleanBundle(p.bundle);if(!nodes.length)throw fail('No new linked records.');
 const fields=normalise('exhibitions',p.fields||{},{strict:true}),body=typeof p.body==='string'?p.body:'';
 const used=refs(fields),linked=new Set(used.map(n=>n.type+':'+n.slug)),newKeys=new Set(nodes.map(n=>n.type+':'+n.slug));
 for(const n of nodes){if(!n.reviewed)throw fail('Review this new record first: '+n.name);if(!linked.has(n.type+':'+n.slug))throw fail('Unlinked candidate: '+n.name+'. Remove it or link it before publishing.');}
 for(const n of used)if(!newKeys.has(n.type+':'+n.slug)&&!await exists(getPaths(root,n.type,n.slug).file))throw fail('Missing linked record: '+n.type+'/'+n.slug);
 const sourceSha=p.originalTextSha==null?null:p.originalTextSha;
 if(sourceSha!==null&&(!/^[a-f0-9]{64}$/.test(sourceSha)||!await exists(path.join(privateDir,'originals',`text-${sourceSha}.txt`))))throw fail('Original text snapshot missing.');
 if(!fields.visitedOn.startsWith('2026-')){const template=await read(path.join(root,'src/pages/exhibitions/[slug].astro'));if(template?.toString().includes("dateLabel.replaceAll('-','.')}.2026"))throw fail('Exhibition date template hardcodes 2026; fix it before publication.');}
 const catalog=await readCatalog(),meta=await readConceptMeta(root),existing={};
 for(const t of types){existing[t]=await recordList(root,t);for(const row of existing[t])if(t==='concepts')row.fields={...row.fields,aliases:[...new Set([...(Array.isArray(row.fields?.aliases)?row.fields.aliases:[]),...(meta[row.slug]?.aliases||[])])]};}
 const seenNames=new Set(),writes=[];
 for(const n of nodes){const keys=[...new Set([n.type+':'+norm(n.name),n.type+':'+norm(n.slug)])];if(!norm(n.name)||keys.some(k=>seenNames.has(k)))throw fail('Duplicate candidate name or ID: '+n.name);for(const k of keys)seenNames.add(k);
  const file=getPaths(root,n.type,n.slug).file;
  if(await exists(file))throw fail('Public ID already exists: '+n.slug+'. Link the existing record instead.',409);
  for(const row of [...existing[n.type],...(catalog[n.type]||[])])if(variants(row).includes(norm(n.name))||variants(row).includes(norm(n.slug)))throw fail('Possible duplicate/alias: '+n.name+' → '+row.title+' ('+row.slug+'). Use the existing record.',409);
  for(const ent of await names(path.join(draftDir,n.type))){if(!ent.isFile()||!ent.name.endsWith('.json'))continue;let draft;try{draft=JSON.parse((await fs.readFile(path.join(draftDir,n.type,ent.name),'utf8')))}catch{throw fail('Unreadable private draft; check '+ent.name+' first.',409)}
   if(draft.slug===n.slug||variants({title:draft.fields?.name||draft.fields?.title,slug:draft.slug,fields:draft.fields}).includes(norm(n.name)))throw fail('Separate private draft already exists for '+n.name+'. Review it separately; it will not be overwritten or published.',409);
  }
  const f=normalise(n.type,n.type==='concepts'?{title:n.name}:n.type==='people'?{name:n.name,kind:n.kind}:{name:n.name,city:n.city},{strict:true});
  writes.push({file,old:null,raw:renderMd(n.type,f,n.body,null),isNew:true});
 }
 const exFile=getPaths(root,'exhibitions',p.slug).file,oldBytes=await read(exFile),old=oldBytes?.toString('utf8')??null;
 if((old!==null&&p.hash!==sha(old))||(old===null&&p.hash))throw fail('Exhibition changed since opening; reload it before publishing.',409);
 const raw=renderMd('exhibitions',fields,body,old);writes.push({file:exFile,old:oldBytes,raw,isNew:old===null});
 const researchDir=path.join(root,'public/murmurgrove/research'),optics=path.join(root,'public/murmurgrove/organism/data/research-current.json');
 const before=await snapshotTree(researchDir),oldOptics=await read(optics);
 const sourceLink=path.join(privateDir,'source-links','exhibitions',p.slug+'.json'),oldLink=sourceSha?await read(sourceLink):null;
 if(old!==null)await saveAtomic(path.join(backupDir,'exhibitions',`${p.slug}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}.md`),oldBytes);
 const applied=[];let syncStarted=false,linkStarted=false;
 try{
  for(const w of writes){if(w.isNew){await fs.mkdir(path.dirname(w.file),{recursive:true});const handle=await fs.open(w.file,'wx');applied.push(w);try{await handle.writeFile(w.raw);}finally{await handle.close();}}else{if(!(await read(w.file))?.equals(w.old))throw fail('Record changed during publication.',409);await saveAtomic(w.file,w.raw);applied.push(w);}}
  // Validate the complete graph before generating its public artifacts.
  await syncGraph(root,{write:false});syncStarted=true;const sync=await syncGraph(root);
  if(sourceSha){linkStarted=true;await saveAtomic(sourceLink,JSON.stringify({type:'exhibitions',slug:p.slug,originalTextSha:sourceSha,linkedAt:new Date().toISOString(),privacy:'PRIVATE_LOCAL_REFERENCE'},null,2)+'\n');}
  return {ok:true,kind:'published-bundle',relativePath:'src/data/exhibitions/'+p.slug+'.md',sha256:sha(raw),created:nodes.map(n=>n.type+'/'+n.slug),research:{graphHash:sync.graph.graphHash,changed:sync.changed}};
 }catch(e){const errors=[];const attempt=async f=>{try{await f()}catch(x){errors.push(x.message)}};
  for(const w of applied.reverse())await attempt(async()=>w.old===null?fs.rm(w.file,{force:true}):saveAtomic(w.file,w.old));
  if(syncStarted){await attempt(()=>restoreTree(researchDir,before,saveAtomic));await attempt(()=>oldOptics===null?fs.rm(optics,{force:true}):saveAtomic(optics,oldOptics));}
  if(linkStarted)await attempt(()=>oldLink===null?fs.rm(sourceLink,{force:true}):saveAtomic(sourceLink,oldLink));
  if(errors.length)throw fail('Rollback incomplete. DO NOT Commit/Push. Restore from private backup and inspect Git diff: '+errors.join('; '),500);
  throw fail('Bundle publication rolled back: '+e.message,e.status||422);
 }
}
