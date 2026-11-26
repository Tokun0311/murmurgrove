import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {readArchive,hash,CATEGORIES,slugValid,SOURCE_DIR} from './research-core.mjs';
const fail=m=>Object.assign(new Error(m),{status:422});
const uuid=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s);
const text=(s,max=12000)=>{if(typeof s!=='string'||!s.trim()||s.length>max)throw fail('Enter nonempty text within '+max+' characters');return s.trim();};
async function readJSON(file){return JSON.parse(await fs.readFile(file,'utf8'));}
async function names(dir){try{return await fs.readdir(dir)}catch(e){if(e.code==='ENOENT')return [];throw e;}}
async function atomic(file,obj){await fs.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.'+crypto.randomUUID()+'.tmp';try{await fs.writeFile(tmp,JSON.stringify(obj,null,2)+'\n',{flag:'wx',mode:0o600});await fs.rename(tmp,file);}finally{await fs.rm(tmp,{force:true});}}
const qdir=p=>path.join(p,'questions');
const qfile=(p,id)=>{if(!uuid(id))throw fail('Invalid question ID');return path.join(qdir(p),id+'.json');};
export async function listQuestions(privateDir){const out=[];for(const f of await names(qdir(privateDir))){if(!f.endsWith('.json')||!uuid(f.slice(0,-5)))continue;const q=await readJSON(path.join(qdir(privateDir),f));if(q.id!==f.slice(0,-5)||q.schema!=='murmurgrove.private-question.1'||!Array.isArray(q.entries))throw fail('Question file is invalid: '+f);out.push(q);}return out.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
async function publicRecord(root,key){const r=(await readArchive(root)).find(x=>x.key===key);if(!r)throw fail('Select an existing public record');return r;}
export async function createQuestion(root,privateDir,p){const question=text(p.question,2000),at=new Date().toISOString(),id=crypto.randomUUID();const q={schema:'murmurgrove.private-question.1',id,question,status:'ongoing',createdAt:at,updatedAt:at,entries:[{kind:'origin',at,text:question}]};if(p.record){const r=await publicRecord(root,p.record);q.entries.push({kind:'link',at,record:r.key,title:r.title,sourceHash:r.contentHash,text:''});}await atomic(qfile(privateDir,id),q);return q;}
export async function appendQuestion(root,privateDir,p){const file=qfile(privateDir,p.id),q=await readJSON(file);if(q.schema!=='murmurgrove.private-question.1'||q.id!==p.id||!Array.isArray(q.entries))throw fail('Invalid private question');if(p.expected!==q.entries.length)throw Object.assign(new Error('Question changed. Reload before adding a reflection.'),{status:409});if(q.entries.length>=5000)throw fail('Question history limit reached');const at=new Date().toISOString();let e={kind:p.kind,at};
 if(p.kind==='reflection'||p.kind==='revision'){e.text=text(p.text,p.kind==='revision'?2000:12000);if(p.kind==='revision')q.question=e.text;}
 else if(p.kind==='status'){if(!['ongoing','paused','resolved'].includes(p.status))throw fail('Invalid question status');q.status=p.status;e.status=p.status;e.text=typeof p.text==='string'&&p.text.trim()?text(p.text):'';}
 else if(p.kind==='link'){if(!p.record)throw fail('Select a record');e.text=typeof p.text==='string'&&p.text.trim()?text(p.text):'';}
 else throw fail('Invalid question action');
 if(p.record){const r=await publicRecord(root,p.record);e.record=r.key;e.title=r.title;e.sourceHash=r.contentHash;}
 q.entries.push(e);q.updatedAt=at;await atomic(file,q);return q;
}
// A public annotation, NOT an automatic copy of old or private text. Explicit consent required.
export async function annotateRevision(root,p){if(p.confirm!==true)throw fail('Confirm public revision annotation');const r=await publicRecord(root,p.record);if(!['correction','addition','reinterpretation','withdrawal'].includes(p.kind))throw fail('Choose a revision kind');const note=text(p.note,2000);if(p.sourceHash!==r.contentHash)throw Object.assign(new Error('Record changed. Reload and check the current text first.'),{status:409});const at=new Date().toISOString();const row={schema:'murmurgrove.record-revision.1',at,record:r.key,kind:p.kind,note,sourceHash:r.contentHash};const file=path.join(root,SOURCE_DIR,'record-history',r.type,r.id,at.replace(/[:.]/g,'-')+'-'+crypto.randomUUID()+'.json');await atomic(file,row);return row;}
export async function readRevisionNotes(root,type,id){if(!CATEGORIES.includes(type)||!slugValid(id))return [];const dir=path.join(root,SOURCE_DIR,'record-history',type,id);const out=[];for(const f of await names(dir)){if(!f.endsWith('.json'))continue;const row=await readJSON(path.join(dir,f));if(row.schema==='murmurgrove.record-revision.1'&&row.record===type+':'+id&&typeof row.note==='string'&&['correction','addition','reinterpretation','withdrawal'].includes(row.kind)&&typeof row.at==='string')out.push(row);}return out.sort((a,b)=>b.at.localeCompare(a.at));}

// Public timeline exposes dates and change categories, never earlier note text.
export async function conceptRevisionTimeline(root,id){
 if(!slugValid(id))return [];const dir=path.join(root,SOURCE_DIR,'concept-history',id);const out=[];
 for(const f of await names(dir)){if(!f.endsWith('.json'))continue;const row=await readJSON(path.join(dir,f));if(typeof row.at!=='string')continue;
  if(row.schema==='murmurgrove.concept-revision.1'&&row.id===id)out.push({at:row.at,kind:row.previous?'Concept reading revised':'First structured reading'});
  else if(row.schema==='murmurgrove.concept-merge.1'&&row.from===id)out.push({at:row.at,kind:'Current classification revised'});
 }return out.sort((a,b)=>b.at.localeCompare(a.at));
}
