/** murmurgrove editor v0.3. Local-only, dependency-free Markdown editor. */
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { analyzeExhibition, validateAiSuggestions, buildAiPrompt, validateNewRecordProposals } from './analyzer.mjs';
import {extractDocx} from './word-import.mjs';
import {cleanBundle,publishBundle} from './bundle.mjs';
// MURMURGROVE_EXHIBITION_FIRST_V12
import {readArchive,buildGraph,answerQuestion,groundedPrompt,readEvents,activeRelations,validateClaim,appendEvent,readConceptMeta,updateConceptMeta,mergeConcept,syncGraph,hash as digest,slugValid} from './research-core.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const TYPE_FIELDS = {
  exhibitions: { required: ['title','visitedOn','region','location','kind'], optional: ['dateLabel','artists','concepts','institution','relatedInstitutions','exhibitionEnd','verification'] },
  people: { required: ['name'], optional: ['kind','reading','sortName'] },
  institutions: { required: ['name'], optional: ['city','longitude','latitude','locationType','address','addressStatus','addressSource','venueName','venueAddress','venueStatus','associatedProject'] },
  concepts: { required: ['title'], optional: [] },
  writing: { required: ['title','date','description'], optional: ['type','language','tags','draft'] }
};
const RELATIONS = {artists:'people',concepts:'concepts',institution:'institutions',relatedInstitutions:'institutions'};
const ARRAY_KEYS = new Set(['artists','concepts','relatedInstitutions','tags']);
const BOOL_KEYS = new Set(['draft']);
const NUMBER_KEYS = new Set(['latitude','longitude']);
const ALLOWED_TYPES = new Set(Object.keys(TYPE_FIELDS));
const KEY_RE = /^([A-Za-z][\w-]*):(?:\s|$)/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugOk = s => typeof s === 'string' && s.length <= 100 && SLUG_RE.test(s);
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const typeName = t => t === 'writing' ? 'writing' : t;
const requireType = t => { if (!ALLOWED_TYPES.has(t)) throw Object.assign(new Error('Unknown collection'),{status:400}); return t; };
function requireSlug(s){ if (!slugOk(s)) throw Object.assign(new Error('Use a lowercase slug with letters, numbers and hyphens only.'),{status:400}); return s; }
function getPaths(root,type,slug){requireType(type);requireSlug(slug);const base=path.join(root,'src','data',typeName(type));return {base,file:path.join(base,`${slug}.md`)};}
function splitMd(raw){ const match=raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);if(!match)throw Object.assign(new Error('Missing or unsupported YAML frontmatter. Original file left untouched.'),{status:422});return {yaml:match[1],body:raw.slice(match[0].length)}; }
function blocksOf(yaml){
  const lines=yaml.replace(/\r\n/g,'\n').split('\n'), out=[];
  let b=null;
  for (const line of lines){const m=line.match(KEY_RE);if(m){if(b)out.push(b);b={key:m[1],lines:[line]};}else if(b){b.lines.push(line);}else {out.push({key:null,lines:[line]});}}
  if(b)out.push(b);
  return out;
}
function parseScalar(s){
  const t=String(s??'').trim();if(!t)return '';
  if((t[0]==='"'&&t.at(-1)==='"')){try{return JSON.parse(t)}catch{return t.slice(1,-1)}}
  if(t[0]==="'"&&t.at(-1)==="'")return t.slice(1,-1).replace(/''/g,"'");
  if(t==='true')return true;if(t==='false')return false;
  if(/^[-+]?\d+(?:\.\d+)?$/.test(t))return Number(t);
  if(t.startsWith('[')&&t.endsWith(']')){
    try{return JSON.parse(t)}catch{
      // Simple inline YAML array; preserves unquoted IDs and quoted values.
      const a=[],re=/(?:"(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^,])+|(?=,)/g;
      for(const item of t.slice(1,-1).match(re)||[]){const v=item.trim();if(v)a.push(parseScalar(v));}return a;
    }
  }
  return t.replace(/\s+#.*$/,'');
}
function readFields(yaml){
  const out={};for(const b of blocksOf(yaml)){if(!b.key)continue;
    const first=b.lines[0].replace(KEY_RE,'').trim();
    if(first==='' && b.lines.slice(1).some(l=>/^\s*- /.test(l))){out[b.key]=b.lines.slice(1).filter(l=>/^\s*- /.test(l)).map(l=>parseScalar(l.replace(/^\s*- /,'')));}
    else out[b.key]=parseScalar(first);
  }return out;
}
function renderValue(key,value){
  if(ARRAY_KEYS.has(key))return JSON.stringify(value);
  if(BOOL_KEYS.has(key))return value?'true':'false';
  if(NUMBER_KEYS.has(key))return String(value);
  return JSON.stringify(String(value));
}
function own(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
function normalise(type,submitted,{strict=false}={}){
  requireType(type);const f=TYPE_FIELDS[type];const fields={};
  if(!submitted||typeof submitted!=='object'||Array.isArray(submitted))throw Object.assign(new Error('Invalid form data'),{status:400});
  for(const k of [...f.required,...f.optional]){
    let v=submitted[k];
    if(ARRAY_KEYS.has(k)){if(v===undefined||v===null)v=[];if(!Array.isArray(v)||v.some(x=>typeof x!=='string'||!slugOk(x)&&k!=='tags'))throw Object.assign(new Error('Invalid '+k+' values'),{status:400});fields[k]=[...new Set(v.map(x=>x.trim()).filter(Boolean))];}
    else if(BOOL_KEYS.has(k)){fields[k]=v===true;}
    else if(NUMBER_KEYS.has(k)){
      if(v===''||v===null||v===undefined)continue;
      if(!Number.isFinite(Number(v)))throw Object.assign(new Error('Invalid coordinate for '+k),{status:400});fields[k]=Number(v);
    } else if(v!==null && v!==undefined){
      if(typeof v!=='string')v=String(v);
      if(v.trim()!==''||f.required.includes(k))fields[k]=v.trim();
    }
  }
  if(strict){
    for(const k of f.required)if(!fields[k])throw Object.assign(new Error('Required: '+k),{status:422});
    if(type==='exhibitions'){
      if(!isDate(fields.visitedOn))throw Object.assign(new Error('Use an ISO visit date, YYYY-MM-DD'),{status:422});
      fields.dateLabel=fields.visitedOn.slice(5);
      if(fields.exhibitionEnd && !isDate(fields.exhibitionEnd))throw Object.assign(new Error('Invalid exhibition end date'),{status:422});
      if(!['recorded','needs-review'].includes(fields.verification||'needs-review'))throw Object.assign(new Error('Unknown verification status'),{status:422});
      fields.verification ||= 'needs-review';
    }
    if(type==='institutions'){
      for(const [k,valid] of Object.entries({locationType:['site','city','variable'],addressStatus:['verified','needs-review'],venueStatus:['user-supplied','reference']}))if(fields[k]&&!valid.includes(fields[k]))throw Object.assign(new Error('Invalid '+k),{status:422});
      if(fields.addressSource){try{new URL(fields.addressSource)}catch{throw Object.assign(new Error('Invalid address source URL'),{status:422})}}
    }
    if(type==='writing'){
      if(!isDate(fields.date))throw Object.assign(new Error('Invalid writing date'),{status:422});
      fields.draft=false; fields.type||='Research note';fields.language||='EN';
    }
  }
  return fields;
}
function renderMd(type,fields,body,original){
  let yaml;
  const wanted=[...TYPE_FIELDS[type].required,...TYPE_FIELDS[type].optional];
  if(original){
    const prev=splitMd(original);const blocks=blocksOf(prev.yaml);const written=new Set();
    const next=blocks.map(b=>{
      if(!b.key||!wanted.includes(b.key))return b.lines.join('\n');
      written.add(b.key);
      return own(fields,b.key)?`${b.key}: ${renderValue(b.key,fields[b.key])}`:'';
    }).filter(x=>x!=='');
    for(const k of wanted)if(!written.has(k)&&own(fields,k))next.push(`${k}: ${renderValue(k,fields[k])}`);
    yaml=next.join('\n').trim();
  }else yaml=wanted.filter(k=>own(fields,k)).map(k=>`${k}: ${renderValue(k,fields[k])}`).join('\n');
  return `---\n${yaml}\n---\n\n${String(body||'').trimEnd()}\n`;
}
function apiError(status,message){return Object.assign(new Error(message),{status});}
function isDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;const d=new Date(s+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;}
function json(res,status,obj){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(obj));}
async function readJSON(req,maxSize=1024*1024){
  if(!req.headers['content-type']?.startsWith('application/json'))throw apiError(415,'Expected application/json');
  let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>maxSize)throw apiError(413,'Request body too large');chunks.push(c);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw apiError(400,'Invalid JSON')}
}
async function exists(p){try{await fsp.access(p);return true}catch{return false}}
async function recordList(root,type){
  const dir=path.join(root,'src/data',typeName(requireType(type)));
  const names=(await fsp.readdir(dir)).filter(x=>x.endsWith('.md') && slugOk(x.slice(0,-3)));
  const items=[];
  for(const name of names){try{const raw=await fsp.readFile(path.join(dir,name),'utf8');const fields=readFields(splitMd(raw).yaml);items.push({slug:name.slice(0,-3),title:String(fields.title||fields.name||name),subtitle:type==='exhibitions'?`${fields.visitedOn||''} · ${fields.location||''}`:String(fields.city||fields.kind||''),fields});}catch{items.push({slug:name.slice(0,-3),title:name,subtitle:'Unable to read frontmatter',fields:{}});}}
  items.sort((a,b)=>type==='exhibitions'?String(b.fields.visitedOn||'').localeCompare(String(a.fields.visitedOn||'')):a.title.localeCompare(b.title));return items;
}
async function checkRelations(root,fields){
  for(const [field,type] of Object.entries(RELATIONS)){
    const ids=Array.isArray(fields[field])?fields[field]:fields[field]?[fields[field]]:[];
    for(const id of ids){if(!slugOk(id)||!await exists(getPaths(root,type,id).file))throw apiError(422,`Missing ${type} record: ${id}. Create the related record first.`);}
  }
}
async function saveAtomic(file,content){await fsp.mkdir(path.dirname(file),{recursive:true});const tmp=path.join(path.dirname(file),`.${path.basename(file)}.${crypto.randomBytes(5).toString('hex')}.tmp`);try{await fsp.writeFile(tmp,content,{flag:'wx'});await fsp.rename(tmp,file)}finally{await fsp.rm(tmp,{force:true}).catch(()=>{})}}
export async function createEditor({root=path.resolve(here,'..'),port=4317,openBrowser=false,privateRoot=null}={}){
  root=path.resolve(root);port=Number(port);
  if(!await exists(path.join(root,'src','content.config.ts'))||!await exists(path.join(root,'src','data')))throw new Error(`This editor must live inside the Astro project root. Expected src/data/ and src/content.config.ts in ${root}`);
  const privateDir=privateRoot?path.resolve(privateRoot):path.join(here,'.private'),draftDir=path.join(privateDir,'drafts'),backupDir=path.join(privateDir,'backups');
  const token=crypto.randomBytes(24).toString('hex');
  let updateQueue=Promise.resolve();
  async function serializeWrite(fn){const prior=updateQueue;let release;updateQueue=new Promise(resolve=>release=resolve);await prior;try{return await fn()}finally{release()}}
  const files={'/':{file:'index.html',mime:'text/html; charset=utf-8'},'/assets/editor.css':{file:'assets/editor.css',mime:'text/css; charset=utf-8'},'/assets/editor.js':{file:'assets/editor.js',mime:'application/javascript; charset=utf-8'},'/assets/research.js':{file:'assets/research.js',mime:'application/javascript; charset=utf-8'}};
  async function readCatalog(){
    const entries=await Promise.all(['people','institutions','concepts','exhibitions'].map(t=>recordList(root,t)));
    const cmeta=await readConceptMeta(root);
    for(const row of entries[2])row.fields.aliases=cmeta[row.slug]?.aliases||[];
    const active=new Map(entries[2].map(c=>[c.slug,c]));
    for(const old of entries[2])if(cmeta[old.slug]?.mergedInto){const newId=cmeta[old.slug].mergedInto,canonical=active.get(newId);if(canonical){canonical.fields.aliases=[...new Set([...(canonical.fields.aliases||[]),old.title,...(old.fields.aliases||[])])];}}
    entries[2]=entries[2].filter(x=>!cmeta[x.slug]?.mergedInto);
    return {people:entries[0],institutions:entries[1],concepts:entries[2],exhibitions:entries[3]};
  }
  const server=http.createServer(async(req,res)=>{
    try{
      const hostname=req.headers.host||'';
      if(!/^((127\.0\.0\.1)|(localhost)):\d+$/.test(hostname)){return json(res,403,{error:'Localhost only'});}
      const u=new URL(req.url,'http://127.0.0.1:'+port);
      if(req.method==='GET'&&files[u.pathname]){
        const asset=files[u.pathname];const bytes=await fsp.readFile(path.join(here,asset.file));res.writeHead(200,{'content-type':asset.mime,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});return res.end(bytes);
      }
      if(req.method==='GET'&&u.pathname==='/api/bootstrap')return json(res,200,{token,project:path.basename(root),collections:Object.keys(TYPE_FIELDS),writingRoute:await exists(path.join(root,'src/pages/writing/index.astro'))});
      if(req.method==='GET'&&u.pathname==='/api/records')return json(res,200,{items:await recordList(root,requireType(u.searchParams.get('type')))});
      if(req.method==='GET'&&u.pathname==='/api/record'){
        const type=requireType(u.searchParams.get('type')),slug=requireSlug(u.searchParams.get('slug')),file=getPaths(root,type,slug).file;
        if(!await exists(file))throw apiError(404,'Record not found');const raw=await fsp.readFile(file,'utf8');const p=splitMd(raw);
        let originalTextSha=null;
        const privateLink=path.join(privateDir,'source-links',type,`${slug}.json`);
        if(await exists(privateLink)){try{originalTextSha=JSON.parse(await fsp.readFile(privateLink,'utf8')).originalTextSha||null}catch{}}
        return json(res,200,{type,slug,fields:readFields(p.yaml),body:p.body,hash:sha(raw),originalTextSha});
      }
      if(req.method==='GET'&&u.pathname==='/api/relations')return json(res,200,{claims:activeRelations(await readEvents(root))});
      if(req.method==='GET'&&u.pathname==='/api/concept-meta')return json(res,200,{concepts:await readConceptMeta(root)});
      if(req.method==='GET'&&u.pathname==='/api/history'){
        const file=path.join(root,'public/murmurgrove/research/history-index.json');return json(res,200,{entries:await exists(file)?JSON.parse(await fsp.readFile(file,'utf8')):[]});
      }
      if(req.method==='GET'&&u.pathname==='/api/drafts'){
        const type=requireType(u.searchParams.get('type'));const dir=path.join(draftDir,type);
        const names=await exists(dir)?(await fsp.readdir(dir)).filter(x=>x.endsWith('.json')):[];
        const items=[];for(const name of names){try{const x=JSON.parse(await fsp.readFile(path.join(dir,name),'utf8'));if(!slugOk(x.slug))continue;items.push({slug:x.slug,title:x.fields?.title||x.fields?.name||x.slug,updatedAt:x.updatedAt})}catch{}}
        return json(res,200,{items:items.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''))});
      }
      if(req.method==='GET'&&u.pathname==='/api/draft'){
        const type=requireType(u.searchParams.get('type')),slug=requireSlug(u.searchParams.get('slug'));
        const file=path.join(draftDir,type,`${slug}.json`);if(!await exists(file))throw apiError(404,'Draft not found');return json(res,200,JSON.parse(await fsp.readFile(file,'utf8')));
      }
      if(req.method==='POST'&&['/api/analyze','/api/ai-prompt','/api/ai-review','/api/new-review','/api/candidate-draft','/api/draft','/api/publish','/api/bundle-publish','/api/delete-draft','/api/capture-original','/api/import-word','/api/ask','/api/ask-local-ai','/api/grounded-prompt','/api/relation-preview','/api/relation-approve','/api/relation-withdraw','/api/concept-meta','/api/concept-merge','/api/sync-research'].includes(u.pathname)){
        const expectedOrigin=`http://127.0.0.1:${server.address().port}`;
        if(req.headers.origin!==expectedOrigin||req.headers['x-editor-token']!==token)throw apiError(403,'Untrusted request');
        const p=await readJSON(req,u.pathname==='/api/import-word'?12*1024*1024:1024*1024);
        if(u.pathname==='/api/capture-original'){
          if(typeof p.text!=='string'||!p.text.trim()||Buffer.byteLength(p.text,'utf8')>700000)throw apiError(422,'Original text must be nonempty and under 700 KB UTF-8. Split larger notes into sections.');
          const fingerprint=sha(p.text);
          const originals=path.join(privateDir,'originals');await fsp.mkdir(originals,{recursive:true});
          const file=path.join(originals,`text-${fingerprint}.txt`);
          try{await fsp.writeFile(file,p.text,{flag:'wx',mode:0o600})}catch(e){if(e.code!=='EEXIST')throw e}
          const metadata=path.join(originals,`text-${fingerprint}.json`);
          if(!await exists(metadata))await saveAtomic(metadata,JSON.stringify({sha256:fingerprint,title:typeof p.title==='string'?p.title.slice(0,150):'',capturedAt:new Date().toISOString(),format:'text/plain; charset=utf-8',source:'explicit-user-snapshot',privacy:'PRIVATE_LOCAL_ORIGINAL'},null,2)+'\n');
          return json(res,200,{ok:true,sha256:fingerprint,relativePath:'murmurgrove-editor/.private/originals/text-'+fingerprint+'.txt',warning:'Snapshot saved only on this computer, excluded from Git. No public content or archive relationship changed.'});
        }
        if(u.pathname==='/api/import-word'){
          if(typeof p.name!=='string'||p.name.length>255||!/^.+\.docx$/i.test(p.name)||typeof p.base64!=='string'||p.base64.length>11*1024*1024||!/^[A-Za-z0-9+/]+=*$/.test(p.base64))throw apiError(422,'Select a .docx Word file under 8 MB. Legacy .doc is not supported.');
          const bytes=Buffer.from(p.base64,'base64');if(bytes.length>8*1024*1024)throw apiError(413,'Word document too large');
          let textBody;try{textBody=extractDocx(bytes)}catch(e){throw apiError(422,e.message)}
          const fingerprint=digest(bytes.toString('base64'));const originals=path.join(privateDir,'originals');await fsp.mkdir(originals,{recursive:true});
          const file=path.join(originals,`${fingerprint}.docx`);
          try{await fsp.writeFile(file,bytes,{flag:'wx'})}catch(e){if(e.code!=='EEXIST')throw e}
          const meta=path.join(originals,`${fingerprint}.json`);
          if(!await exists(meta))await saveAtomic(meta,JSON.stringify({sha256:crypto.createHash('sha256').update(bytes).digest('hex'),filename:path.basename(p.name),importedAt:new Date().toISOString(),textSha256:sha(textBody),privacy:'PRIVATE_LOCAL_ORIGINAL'},null,2)+'\n');
          return json(res,200,{ok:true,name:p.name,text:textBody,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),originalCopy:'murmurgrove-editor/.private/originals/'+fingerprint+'.docx',warning:'Original Word file copied locally and excluded from Git. No public file was changed.'});
        }
        if(['/api/ask','/api/grounded-prompt','/api/ask-local-ai'].includes(u.pathname)){
          const g=await buildGraph(root),answer=answerQuestion(p.question,g);
          if(u.pathname==='/api/ask')return json(res,200,answer);
          if(u.pathname==='/api/grounded-prompt')return json(res,200,{prompt:groundedPrompt(p.question,answer),evidenceCount:answer.results.length});
          if(!answer.results.length)throw apiError(422,'No published evidence matched. Add records or improve the question before asking AI.');
          const model=String(p.model||'').trim();if(!/^[a-zA-Z0-9_.:\/-]{2,90}$/.test(model))throw apiError(422,'Provide an installed local Ollama model name.');
          let output;try{
            const local=await fetch('http://127.0.0.1:11434/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,prompt:groundedPrompt(p.question,answer),stream:false,options:{temperature:0.15,num_predict:900}}),signal:AbortSignal.timeout(120000)});
            if(!local.ok)throw new Error('Ollama HTTP '+local.status+' (model may not be installed)');
            const result=await local.json();output=String(result.response||'').slice(0,16000);
            if(!output.trim())throw new Error('Local model returned an empty response');
          }catch(e){throw apiError(503,'Local model unavailable: '+e.message+'. No online service was contacted.');}
          const markers=[...output.matchAll(/\[S(\d+)\]/g)].map(m=>Number(m[1]));
          const invalid=markers.filter(n=>n<1||n>answer.results.length);
          if(invalid.length)throw apiError(422,'Model invented a source citation. Answer rejected; retry with grounded sources.');
          return json(res,200,{analysis:output,method:'OPTIONAL_LOCAL_OLLAMA_ANALYSIS_NOT_VERIFIED_FACT',sources:answer.results,model,warning:'AI interpretation requires human checking. The prompt contained only published archive excerpts.'});
        }
        if(u.pathname==='/api/relation-preview'){
          try{return json(res,200,{claim:await validateClaim(root,p.claim)})}catch(e){throw apiError(422,e.message)}
        }
        if(u.pathname==='/api/relation-approve'){
          if(p.confirm!==true)throw apiError(422,'Review and confirm relation publication');
          return await serializeWrite(async()=>{try{const e=await appendEvent(root,{action:'approve',claim:p.claim});const synced=await syncGraph(root);return json(res,200,{ok:true,event:e,graphHash:synced.graph.graphHash})}catch(e){throw apiError(422,e.message)}});
        }
        if(u.pathname==='/api/relation-withdraw'){
          if(p.confirm!==true)throw apiError(422,'Confirm withdrawing this interpretation');
          return await serializeWrite(async()=>{try{const e=await appendEvent(root,{action:'withdraw',claimId:p.claimId,reason:p.reason});const synced=await syncGraph(root);return json(res,200,{ok:true,event:e,graphHash:synced.graph.graphHash})}catch(e){throw apiError(422,e.message)}});
        }
        if(u.pathname==='/api/concept-meta'){
          if(p.confirm!==true)throw apiError(422,'Confirm concept metadata update');
          return await serializeWrite(async()=>{try{const meta=await updateConceptMeta(root,p);const synced=await syncGraph(root);return json(res,200,{ok:true,meta,graphHash:synced.graph.graphHash})}catch(e){throw apiError(422,e.message)}});
        }
        if(u.pathname==='/api/concept-merge'){
          if(p.confirm!==true)throw apiError(422,'Explicitly confirm merging these concepts');
          return await serializeWrite(async()=>{try{const merged=await mergeConcept(root,p);const sync=await syncGraph(root);return json(res,200,{ok:true,merged,graphHash:sync.graph.graphHash})}catch(e){throw apiError(422,e.message)}});
        }
        if(u.pathname==='/api/sync-research'){
          if(p.confirm!==true)throw apiError(422,'Confirm local publication of derived research index');
          return await serializeWrite(async()=>{const result=await syncGraph(root);return json(res,200,{ok:true,changed:result.changed,summary:result.summary||null,graphHash:result.graph.graphHash,records:result.graph.records.length,relations:result.graph.relations.length,warning:'Generated source state is NOT a historical organism frame.'})});
        }
        if(['/api/analyze','/api/ai-prompt','/api/ai-review'].includes(u.pathname)){
          if(p.type!=='exhibitions')throw apiError(422,'Analysis currently supports Exhibitions only');
          if(typeof p.title!=='string'||typeof p.body!=='string'||typeof p.location!=='string'||p.body.length>100000||p.title.length>1000||p.location.length>800)throw apiError(422,'Invalid or excessive text to analyze');
          const request={title:p.title,location:p.location,body:p.body,slug:slugOk(p.slug)?p.slug:'',fields:p.fields&&typeof p.fields==='object'?p.fields:{}};
          const catalog=await readCatalog();
          if(u.pathname==='/api/analyze')return json(res,200,analyzeExhibition(request,catalog));
          if(u.pathname==='/api/ai-prompt')return json(res,200,{prompt:buildAiPrompt(request,catalog)});
          if(u.pathname==='/api/ai-review'){
            let submitted=p.ai;
            if(typeof submitted==='string')try{submitted=JSON.parse(submitted.replace(/^```(?:json)?\s*|\s*```$/gi,''))}catch{throw apiError(422,'Invalid AI JSON. Paste only the JSON result.');}
            try{return json(res,200,validateAiSuggestions(submitted,request,catalog));}
            catch(e){throw apiError(422,e.message)}
          }
        }
        if(['/api/new-review','/api/candidate-draft'].includes(u.pathname)){
          const source=p.source;
          if(!source || typeof source!=='object'||typeof source.title!=='string'||typeof source.location!=='string'||typeof source.body!=='string'||source.title.length>1000||source.location.length>800||source.body.length>100000)
            throw apiError(422,'Invalid exhibition source for proposal');
          const candidate=p.candidate;
          const catalog=await readCatalog();
          let review;
          try{review=validateNewRecordProposals([candidate],source,catalog)}catch(e){throw apiError(422,e.message)}
          if(review.newAccepted!==1)throw apiError(422,`Proposal rejected: ${review.newRejected[0]?.reason||'invalid or duplicate record'}`);
          const item=review.newRecords[0];
          const type=item.group,slug=requireSlug(item.id),target=getPaths(root,type,slug).file;
          if(u.pathname==='/api/new-review')return json(res,200,{candidate:item});
          // A proposal never writes to the public site, and never edits an existing draft.
          if(await exists(target))throw apiError(409,'This public ID already exists; nothing was written');
          const draft=path.join(draftDir,type,`${slug}.json`);
          if(await exists(draft))throw apiError(409,'A private draft with this ID already exists; review it instead of overwriting');
          const names=await exists(path.join(draftDir,type))?(await fsp.readdir(path.join(draftDir,type))).filter(x=>x.endsWith('.json')):[];
          for(const fn of names){
            try{
              const old=JSON.parse(await fsp.readFile(path.join(draftDir,type,fn),'utf8'));
              const prior=String(old.fields?.title||old.fields?.name||'').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');
              const proposed=item.name.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');
              if(prior&&prior===proposed)throw apiError(409,`Private draft already exists: ${fn}; open it instead`);
            }catch(e){if(e.status)throw e;}
          }
          const fields=type==='people'?{name:item.name,kind:'other'}:type==='institutions'?{name:item.name}:{title:item.name};
          const body=`## Unverified proposal from a research record\n\n> ${item.evidence.quote.replace(/\n/g,'\n> ')}\n\n## Why this link was proposed (unverified)\n\n${item.reason}\n\n## Verification and reliable sources\n\nPending manual review. Do not treat this candidate as a documented participant, director, institution, or established scholarly concept without independent evidence.\n`;
          const doc={type,slug,fields,body,hash:null,proposal:{sourceCollection:'exhibitions',sourceSlug:slugOk(source.slug)?source.slug:null,sourceTitle:source.title,method:item.method,evidence:item.evidence},updatedAt:new Date().toISOString()};
          await fsp.mkdir(path.dirname(draft),{recursive:true});
          try{await fsp.writeFile(draft,JSON.stringify(doc,null,2)+'\n',{flag:'wx'});}catch(e){if(e.code==='EEXIST')throw apiError(409,'Private draft already exists');throw e;}
          return json(res,201,{ok:true,kind:'private-proposed-record',type,slug,relativePath:'murmurgrove-editor/.private/drafts/'+type+'/'+slug+'.json',warning:'Only a private draft was created. Review and publish separately, then link back to the exhibition.'});
        }
        if(u.pathname==='/api/bundle-publish')return await serializeWrite(async()=>json(res,200,await publishBundle(p,{root,privateDir,draftDir,backupDir,normalise,getPaths,recordList,readCatalog,readConceptMeta,renderMd,saveAtomic,syncGraph,sha,exists})));
        return await serializeWrite(async()=>{
        const type=requireType(p.type),slug=requireSlug(p.slug),paths=getPaths(root,type,slug);
        if(u.pathname==='/api/delete-draft'){
          await fsp.rm(path.join(draftDir,type,`${slug}.json`),{force:true});return json(res,200,{ok:true});
        }
        const fields=normalise(type,p.fields||{},{strict:u.pathname==='/api/publish'});
        const body=typeof p.body==='string'?p.body:'';
        const originalTextSha=typeof p.originalTextSha==='string'&&/^[a-f0-9]{64}$/.test(p.originalTextSha)?p.originalTextSha:null;
        if(originalTextSha&&!await exists(path.join(privateDir,'originals',`text-${originalTextSha}.txt`)))throw apiError(422,'Original text snapshot is missing on this computer. Capture it again before saving.');
        if(u.pathname==='/api/draft'){
          const file=path.join(draftDir,type,`${slug}.json`);
          const data={type,slug,fields,body,hash:p.hash||null,wordOriginalSha:typeof p.wordOriginalSha==='string'&&/^[a-f0-9]{64}$/.test(p.wordOriginalSha)?p.wordOriginalSha:null,originalTextSha,...(type==='exhibitions'?{bundle:cleanBundle(p.bundle)}:{}),updatedAt:new Date().toISOString()};
          await saveAtomic(file,JSON.stringify(data,null,2)+'\n');return json(res,200,{ok:true,kind:'draft',relativePath:'murmurgrove-editor/.private/drafts/'+type+'/'+slug+'.json'});
        }
        if(p.confirmPublic!==true)throw apiError(422,'Please confirm public publication');
        if(p.bundle?.length)throw apiError(422,'Use grouped publication for staged linked records.');
        if(type==='writing' && fields.draft===true)throw apiError(422,'Writing must be public to publish');
        await checkRelations(root,fields);
        if(type==='exhibitions' && !fields.visitedOn.startsWith('2026-')){
          const pageFile=path.join(root,'src/pages/exhibitions/[slug].astro');
          if(await exists(pageFile) && (await fsp.readFile(pageFile,'utf8')).includes("dateLabel.replaceAll('-','.')}.2026"))throw apiError(422,'Your public exhibition page still hardcodes year 2026. Fix its Visited date template before publishing a record from another year.');
        }
        const old=await exists(paths.file)?await fsp.readFile(paths.file,'utf8'):null;
        if(old && p.hash!==sha(old))throw apiError(409,'This file changed since you opened it. Reload the original before publishing.');
        if(!old && p.hash)throw apiError(409,'Expected an existing file; it may have moved.');
        if(old){
          const bk=path.join(backupDir,type,`${slug}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}.md`);
          await saveAtomic(bk,old);
        }
        const raw=renderMd(type,fields,body,old);
        await saveAtomic(paths.file,raw);
        let syncResult;
        try{syncResult=await syncGraph(root)}catch(e){
          // Revert the changed record if source-index validation fails. Original backups remain private.
          if(old!==null)await saveAtomic(paths.file,old);else await fsp.rm(paths.file,{force:true});
          throw apiError(422,'Publication rolled back: research synchronization failed: '+e.message);
        }
        if(originalTextSha){
          const link=path.join(privateDir,'source-links',type,`${slug}.json`);
          await saveAtomic(link,JSON.stringify({type,slug,originalTextSha,linkedAt:new Date().toISOString(),privacy:'PRIVATE_LOCAL_REFERENCE'},null,2)+'\n');
        }
        return json(res,200,{ok:true,kind:'published',relativePath:'src/data/'+type+'/'+slug+'.md',updated:!!old,sha256:sha(raw),research:{graphHash:syncResult.graph.graphHash,changed:syncResult.changed},warning:'Research source index synced. Pinned T0 and historical organism snapshots remain unchanged.'});
        });
      }
      return json(res,404,{error:'Not found'});
    }catch(error){console.error('[editor]',error.message);return json(res,error.status||500,{error:error.status?error.message:'Unexpected local editor error; check terminal.'});}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});
  const actual=server.address().port;
  const address=`http://127.0.0.1:${actual}`;
  if(openBrowser && process.platform==='win32'){
    try{const child=spawn('cmd',['/c','start','',address],{detached:true,windowsHide:true,stdio:'ignore'});child.unref()}catch{}
  }
  return {server,address,root,close:()=>new Promise(resolve=>server.close(resolve))};
}
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)){
  try{const {address,root}=await createEditor({port:process.env.MURMURGROVE_EDITOR_PORT||4317,openBrowser:true});console.log('\n  murmurgrove / editor\n  Project: '+root+'\n  Local address: '+address+'\n  Close this window or press Ctrl+C to stop.\n');}
  catch(e){console.error('\nUnable to start murmurgrove editor:',e.message);process.exitCode=1;}
}
