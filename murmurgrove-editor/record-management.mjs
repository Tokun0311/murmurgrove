import fs from 'node:fs/promises';
import path from 'node:path';
// Private withdrawal manifests and optimistic source hashes. No Git history rewriting.
export function createRecordManager({root,privateDir,types,relations,requireType,requireSlug,getPaths,splitMd,blocksOf,readFields,renderValue,exists,saveAtomic,sha,syncGraph,apiError}){
 const directory=path.join(privateDir,'withdrawn-records');
 const manifest=(t,s)=>path.join(directory,requireType(t),requireSlug(s)+'.json');
 const relative=f=>path.relative(root,f).split(path.sep).join('/');
 const read=async f=>await exists(f)?await fs.readFile(f,'utf8'):null;
 const readManifest=async(t,s)=>{const raw=await read(manifest(t,s));return raw?JSON.parse(raw):null};
 async function list(){const items=[];for(const type of types){const dir=path.join(directory,type);if(!await exists(dir))continue;for(const name of await fs.readdir(dir)){if(!name.endsWith('.json'))continue;const m=await readManifest(type,name.slice(0,-5));items.push({type,slug:m.slug,title:m.title,at:m.at});}}return items.sort((a,b)=>b.at.localeCompare(a.at));}
 async function assertAvailable(t,s){if(await exists(manifest(t,s)))throw apiError(409,'This ID is withdrawn. Restore it before republishing.');}
 // Preserve unrelated YAML blocks and the complete body byte-for-byte.
 function unlink(raw,type,slug){const {yaml}=splitMd(raw),fields=readFields(yaml),changed=[];const blocks=blocksOf(yaml);const next=blocks.map(b=>{if(relations[b.key]!==type)return b.lines.join('\n');const v=fields[b.key];if(Array.isArray(v)&&v.includes(slug)){changed.push(b.key);return `${b.key}: ${renderValue(b.key,v.filter(x=>x!==slug))}`;}if(v===slug){changed.push(b.key);return '';}return b.lines.join('\n');});if(!changed.length)return null;return {raw:raw.replace(/^---\r?\n[\s\S]*?\r?\n---(?=\r?\n|$)/,`---\n${next.filter(Boolean).join('\n')}\n---`),fields:changed};}
 async function plan(type,slug){const file=getPaths(root,type,slug).file,raw=await read(file);if(raw===null)throw apiError(404,'Published record not found');const fields=readFields(splitMd(raw).yaml);const changes=[];
  for(const t of [...types,'photography']){const dir=path.join(root,'src/data',t);if(!await exists(dir))continue;for(const name of await fs.readdir(dir)){if(!name.endsWith('.md'))continue;const f=path.join(dir,name);if(f===file)continue;const old=await read(f);const result=unlink(old,type,slug);if(result)changes.push({file:relative(f),before:old,after:result.raw,fields:result.fields});}}
  if(type==='concepts'){const f=path.join(root,'src/data/murmurgrove-relations/concepts.json'),old=await read(f);if(old){const obj=JSON.parse(old);if(obj[slug]?.mergedInto||Object.values(obj).some(x=>x.mergedInto===slug))throw apiError(409,'This concept belongs to a merge chain. Resolve that chain before removal.');if(Object.hasOwn(obj,slug)){delete obj[slug];changes.push({file:relative(f),before:old,after:JSON.stringify(obj,null,2)+'\n',fields:['concept metadata']});}}}
  return {type,slug,title:String(fields.title||fields.name||slug),at:new Date().toISOString(),file:relative(file),raw,changes};
 }
 async function preview(t,s){const p=await plan(requireType(t),requireSlug(s));return {title:p.title,hash:sha(p.raw),affected:p.changes.map(({file,fields})=>({file,fields}))};}
 async function apply(changes){const done=[];try{for(const c of changes){const f=path.join(root,c.file);if(await read(f)!==c.before)throw apiError(409,'Source changed: '+c.file);done.push(c);if(c.after===null)await fs.rm(f);else await saveAtomic(f,c.after);}await syncGraph(root);}catch(e){for(const c of done.reverse()){const f=path.join(root,c.file);if(c.before===null)await fs.rm(f,{force:true});else await saveAtomic(f,c.before);}await syncGraph(root).catch(()=>{});throw e;}}
 async function mutate(action,p){const type=requireType(p.type),slug=requireSlug(p.slug),mf=manifest(type,slug);if(p.confirm!==slug)throw apiError(422,'Type the exact record ID to confirm');const saved=await readManifest(type,slug);
  if(action==='restore'){if(!saved)throw apiError(404,'Withdrawn record not found');const changes=[{file:saved.file,before:null,after:saved.raw},...saved.changes.map(c=>({file:c.file,before:c.after,after:c.before}))];await apply(changes);await fs.rm(mf);return {ok:true};}
  if(action==='delete'&&saved){await fs.rm(mf);return {ok:true,removedPrivateWithdrawal:true};}
  if(saved)throw apiError(409,'Record already withdrawn');const m=await plan(type,slug);if(p.hash!==sha(m.raw))throw apiError(409,'Record changed. Reload before removal.');
  if(action==='withdraw')await saveAtomic(mf,JSON.stringify(m,null,2)+'\n');
  try{await apply([...m.changes,{file:m.file,before:m.raw,after:null}]);}catch(e){if(action==='withdraw')await fs.rm(mf,{force:true});throw e;}return {ok:true,affected:m.changes.length};
 }
 return {list,preview,mutate,assertAvailable};
}
