// MURMURGROVE_EDITOR_V16
// MURMURGROVE_EDITOR_V15
// Atomic publication of the edited record and its reviewed, reachable linked records. No network or Git.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {ASSOCIATIONS as allAssociations,STAGE_TYPES,PROFILE_KEYS as profileKeys,refKey,recordRefs,reachableBundle,externalBundleRefs} from './assets/bundle-links.mjs';
const associationFields=Object.fromEntries(STAGE_TYPES.map(t=>[t,allAssociations]));
const profileArrays=new Set(['practiceFields','roles','institutionTypes','alternativeNames','sources']);
const types=new Set(STAGE_TYPES);
const rootTypes=new Set([...STAGE_TYPES,'exhibitions','writing']);
const slugOk=s=>typeof s==='string'&&s.length<=100&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');
const fail=(message,status=422)=>Object.assign(new Error(message),{status});
const read=async p=>{try{return await fs.readFile(p)}catch(e){if(e.code==='ENOENT')return null;throw e}};
const names=async p=>{try{return await fs.readdir(p,{withFileTypes:true})}catch(e){if(e.code==='ENOENT')return [];throw e}};
export function cleanBundle(input){
 if(input==null)return [];
 if(!Array.isArray(input)||input.length>200)throw fail('At most 200 new linked records per edited record.');
 const seen=new Set();return input.map(n=>{
  if(!n||!types.has(n.type)||!slugOk(n.slug))throw fail('Invalid linked record ID or type.');
  const key=n.type+':'+n.slug;if(seen.has(key))throw fail('Duplicate linked ID: '+key);seen.add(key);
  if(typeof n.name!=='string'||!n.name.trim()||n.name.length>300||typeof n.body!=='string'||n.body.length>100000)throw fail('A linked record needs a name and valid text.');
  if(n.type==='institutions'&&n.city!=null&&(typeof n.city!=='string'||n.city.length>120||/[\r\n]/.test(n.city)))throw fail('Invalid institution city.');
  const associations={};for(const field of Object.keys(associationFields[n.type]||{})){const values=n[field]||[];if(!Array.isArray(values)||values.some(v=>!slugOk(v)))throw fail('Invalid linked archive IDs');associations[field]=[...new Set(values)];}
  const profile={};for(const k of profileKeys[n.type]||[]){let v=n.profile?.[k];if(v==null)continue;if(['latitude','longitude'].includes(k)&&typeof v==='number')v=String(v);if(profileArrays.has(k)){if(!Array.isArray(v)||v.some(x=>typeof x!=='string'||x.length>10000))throw fail('Invalid profile '+k);profile[k]=v;}else{if(typeof v!=='string'||v.length>10000)throw fail('Invalid profile '+k);profile[k]=v;}}
  if(n.sourceDraftHash!=null&&!/^[a-f0-9]{64}$/.test(n.sourceDraftHash))throw fail('Invalid linked draft fingerprint.');
  return {...associations,profile,...(n.sourceDraftHash?{sourceDraftHash:n.sourceDraftHash}:{}),type:n.type,slug:n.slug,name:n.name.trim(),body:n.body,...(n.type==='institutions'?{city:String(n.city||'').trim()}:{}),...(n.type==='people'?{nativeName:String(n.nativeName||'').trim(),alternativeNames:Array.isArray(n.alternativeNames)?n.alternativeNames:[]}:{}),kind:['artist','collective','curator','writer','researcher','architect','designer','critic','other'].includes(n.kind)?n.kind:'other',reviewed:n.reviewed===true};
 });
}
// Convert a private draft into a reviewable candidate without publishing or deleting it.
export function candidateFromDraft(type,slug,bytes,sha){
 const doc=JSON.parse(bytes.toString('utf8'));
 if(!types.has(type)||doc.type!==type||doc.slug!==slug||doc.hash||doc.bundle?.length)throw fail('This private draft needs separate review: '+type+'/'+slug,409);
 const f=doc.fields||{},profile={};for(const k of profileKeys[type])if(f[k]!=null)profile[k]=f[k];
 return cleanBundle([{type,slug,name:f.name||f.title,body:doc.body||'',kind:f.kind,nativeName:f.nativeName,alternativeNames:f.alternativeNames,city:f.city,profile,...Object.fromEntries(Object.keys(allAssociations).map(k=>[k,f[k]||[]])),sourceDraftHash:sha(bytes),reviewed:false}])[0];
}
async function snapshotTree(dir){const map=new Map();async function walk(p){for(const ent of await names(p)){const q=path.join(p,ent.name);if(ent.isSymbolicLink())throw fail('Unexpected symlink in research output; publication stopped.');if(ent.isDirectory())await walk(q);else if(ent.isFile())map.set(q,await fs.readFile(q));}}await walk(dir);return map;}
async function restoreTree(dir,before,saveAtomic){const now=await snapshotTree(dir);for(const f of now.keys())if(!before.has(f))await fs.rm(f,{force:true});for(const [f,bytes] of before)if(!now.get(f)?.equals(bytes))await saveAtomic(f,bytes);}
function variants(row){const f=row.fields||{};return [row.title,row.slug,f.name,f.title,f.nativeName,f.sortName,f.reading,...(Array.isArray(f.aliases)?f.aliases:[]),...(Array.isArray(f.alternativeNames)?f.alternativeNames:[])].map(norm).filter(Boolean);}
export async function publishBundle(p,c){
 const {root,privateDir,draftDir,backupDir,normalise,getPaths,recordList,readCatalog,readConceptMeta,renderMd,saveAtomic,syncGraph,sha,exists}=c;
 if(!rootTypes.has(p.type)||p.confirmPublic!==true||!slugOk(p.slug))throw fail('Confirm the edited record and every new linked record for publication.');
 const nodes=cleanBundle(p.bundle);if(!nodes.length)throw fail('No new linked records.');
 const fields=normalise(p.type,p.fields||{},{strict:true}),body=typeof p.body==='string'?p.body:'';
 if(p.type==='writing'&&p.fields?.draft===true)throw fail('Writing must be public to publish.');
 const rootKey=refKey(p),linked=reachableBundle(p.type,fields,nodes);
 if(recordRefs(p.type,fields).some(r=>refKey(r)===rootKey))throw fail('Cannot link a record to itself.');
 for(const n of nodes){if(refKey(n)===rootKey)throw fail('Linked candidate duplicates the edited record.');if(recordRefs(n.type,n).some(r=>refKey(r)===refKey(n)))throw fail('Cannot link a record to itself: '+n.name);if(!n.reviewed)throw fail('Review this new record first: '+n.name);if(!linked.has(refKey(n)))throw fail('Unlinked candidate: '+n.name+'. Remove it or link it before publishing.');}
 for(const r of externalBundleRefs(p.type,p.slug,fields,nodes))if(!await exists(getPaths(root,r.type,r.slug).file))throw fail('Missing linked archive record: '+r.type+'/'+r.slug);
 const sourceSha=p.originalTextSha==null?null:p.originalTextSha;
 if(sourceSha!==null&&(!/^[a-f0-9]{64}$/.test(sourceSha)||!await exists(path.join(privateDir,'originals',`text-${sourceSha}.txt`))))throw fail('Original text snapshot missing.');
 if(p.type==='exhibitions'&&fields.visitedOn&&!fields.visitedOn.startsWith('2026-')){const template=await read(path.join(root,'src/pages/exhibitions/[slug].astro'));if(template?.toString().includes("dateLabel.replaceAll('-','.')}.2026"))throw fail('Exhibition date template hardcodes 2026; fix it before publication.');}
 const catalog=await readCatalog(),meta=await readConceptMeta(root),existing={};
 for(const t of types){existing[t]=await recordList(root,t);for(const row of existing[t])if(t==='concepts')row.fields={...row.fields,aliases:[...new Set([...(Array.isArray(row.fields?.aliases)?row.fields.aliases:[]),...(meta[row.slug]?.aliases||[])])]};}
 const seenNames=new Set(),writes=[],sourceLinks=[];
 async function keepSourceLink(type,slug,originalTextSha){if(!originalTextSha)return;if(!/^[a-f0-9]{64}$/.test(originalTextSha)||!await exists(path.join(privateDir,'originals',`text-${originalTextSha}.txt`)))throw fail('Original text snapshot missing: '+type+'/'+slug);const file=path.join(privateDir,'source-links',type,slug+'.json');sourceLinks.push({file,old:await read(file),raw:JSON.stringify({type,slug,originalTextSha,linkedAt:new Date().toISOString(),privacy:'PRIVATE_LOCAL_REFERENCE'},null,2)+'\n'});}
 await keepSourceLink(p.type,p.slug,sourceSha);
 if(types.has(p.type)){for(const v of [fields.name||fields.title,p.slug])if(norm(v))seenNames.add(p.type+':'+norm(v));}
 for(const n of nodes){const keys=[...new Set([n.type+':'+norm(n.name),n.type+':'+norm(n.slug)])];if(!norm(n.name)||keys.some(k=>seenNames.has(k)))throw fail('Duplicate candidate name or ID: '+n.name);for(const k of keys)seenNames.add(k);
  const file=getPaths(root,n.type,n.slug).file;
  if(await exists(file))throw fail('Public ID already exists: '+n.slug+'. Link the existing record instead.',409);
  for(const row of [...existing[n.type],...(catalog[n.type]||[])])if(variants(row).includes(norm(n.name))||variants(row).includes(norm(n.slug)))throw fail('Possible duplicate/alias: '+n.name+' → '+row.title+' ('+row.slug+'). Use the existing record.',409);
  let adopted=null;
  for(const ent of await names(path.join(draftDir,n.type))){if(!ent.isFile()||!ent.name.endsWith('.json'))continue;let draft,bytes;try{bytes=await fs.readFile(path.join(draftDir,n.type,ent.name));draft=JSON.parse(bytes.toString('utf8'))}catch{throw fail('Unreadable private draft; check '+ent.name+' first.',409)}
   if(ent.name===n.slug+'.json'&&draft.type===n.type&&draft.slug===n.slug&&n.sourceDraftHash){if(draft.hash||sha(bytes)!==n.sourceDraftHash)throw fail('Linked private draft changed: '+n.name+'. Reload it before reviewing again.',409);adopted=draft;continue;}
   if(draft.slug===n.slug||variants({title:draft.fields?.name||draft.fields?.title,slug:draft.slug,fields:draft.fields}).includes(norm(n.name)))throw fail('Separate private draft already exists for '+n.name+'. Include and review that draft rather than replacing it.',409);
  }
  if(n.sourceDraftHash&&!adopted)throw fail('Linked private draft is missing or changed: '+n.name+'. Reload it before reviewing again.',409);
  if(adopted)await keepSourceLink(n.type,n.slug,adopted.originalTextSha);
  const core=n.type==='concepts'?{title:n.name}:n.type==='people'?{name:n.name,kind:n.kind,nativeName:n.nativeName,alternativeNames:n.alternativeNames}:{name:n.name,city:n.city};
  const f=normalise(n.type,{...(adopted?.fields||{}),...core,...n.profile},{strict:true});
  for(const key of Object.keys(associationFields[n.type]||{}))f[key]=n[key]||[];
  writes.push({file,old:null,raw:renderMd(n.type,f,n.body,null),isNew:true});
 }
 const exFile=getPaths(root,p.type,p.slug).file,oldBytes=await read(exFile),old=oldBytes?.toString('utf8')??null;
 if((old!==null&&p.hash!==sha(old))||(old===null&&p.hash))throw fail('Edited record changed since opening; reload it before publishing.',409);
 const raw=renderMd(p.type,fields,body,old);writes.push({file:exFile,old:oldBytes,raw,isNew:old===null});
 const researchDir=path.join(root,'public/murmurgrove/research'),optics=path.join(root,'public/murmurgrove/organism/data/research-current.json');
 const before=await snapshotTree(researchDir),oldOptics=await read(optics);
 if(old!==null)await saveAtomic(path.join(backupDir,p.type,`${p.slug}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}.md`),oldBytes);
 const applied=[],appliedLinks=[];let syncStarted=false;
 try{
  for(const w of writes){if(w.isNew){await fs.mkdir(path.dirname(w.file),{recursive:true});const handle=await fs.open(w.file,'wx');applied.push(w);try{await handle.writeFile(w.raw);}finally{await handle.close();}}else{if(!(await read(w.file))?.equals(w.old))throw fail('Record changed during publication.',409);await saveAtomic(w.file,w.raw);applied.push(w);}}
  // Validate the complete graph before generating its public artifacts.
  await syncGraph(root,{write:false});syncStarted=true;const sync=await syncGraph(root);
  for(const link of sourceLinks){appliedLinks.push(link);await saveAtomic(link.file,link.raw);}
  return {ok:true,kind:'published-bundle',relativePath:'src/data/'+p.type+'/'+p.slug+'.md',sha256:sha(raw),created:nodes.map(n=>n.type+'/'+n.slug),research:{graphHash:sync.graph.graphHash,changed:sync.changed}};
 }catch(e){const errors=[];const attempt=async f=>{try{await f()}catch(x){errors.push(x.message)}};
  for(const w of applied.reverse())await attempt(async()=>w.old===null?fs.rm(w.file,{force:true}):saveAtomic(w.file,w.old));
  if(syncStarted){await attempt(()=>restoreTree(researchDir,before,saveAtomic));await attempt(()=>oldOptics===null?fs.rm(optics,{force:true}):saveAtomic(optics,oldOptics));}
  for(const link of appliedLinks.reverse())await attempt(()=>link.old===null?fs.rm(link.file,{force:true}):saveAtomic(link.file,link.old));
  if(errors.length)throw fail('Rollback incomplete. DO NOT Commit/Push. Restore from private backup and inspect Git diff: '+errors.join('; '),500);
  throw fail('Bundle publication rolled back: '+e.message,e.status||422);
 }
}
