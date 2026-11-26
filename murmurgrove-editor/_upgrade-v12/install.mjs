import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import readline from 'node:readline/promises';
const here=path.dirname(fileURLToPath(import.meta.url));
const read=p=>fs.readFile(p,'utf8');
const mark='// MURMURGROVE_EXHIBITION_FIRST_V12';
function one(s,from,to,label){const i=s.indexOf(from);if(i<0||s.indexOf(from,i+from.length)>=0)throw Error('Version mismatch: '+label+' (no files changed)');return s.slice(0,i)+to+s.slice(i+from.length);}
function span(s,start,end,newText,label){const i=s.indexOf(start),j=s.indexOf(end,i+start.length);if(i<0||j<0)throw Error('Version mismatch: '+label);return s.slice(0,i)+newText+s.slice(j);}
export function patchServer(s){
 s=one(s,"import {extractDocx} from './word-import.mjs';","import {extractDocx} from './word-import.mjs';\nimport {cleanBundle,publishBundle} from './bundle.mjs';\n"+mark,'server import');
 s=one(s,"'/api/draft','/api/publish','/api/delete-draft'","'/api/draft','/api/publish','/api/bundle-publish','/api/delete-draft'",'route allowlist');
 s=one(s,"        const type=requireType(p.type),slug=requireSlug(p.slug),paths=getPaths(root,type,slug);",`        if(u.pathname==='/api/bundle-publish')return await serializeWrite(async()=>json(res,200,await publishBundle(p,{root,privateDir,draftDir,backupDir,normalise,getPaths,recordList,readCatalog,readConceptMeta,renderMd,saveAtomic,syncGraph,sha,exists})));\n        const type=requireType(p.type),slug=requireSlug(p.slug),paths=getPaths(root,type,slug);`,'bundle endpoint');
 s=one(s,"originalTextSha,updatedAt:new Date().toISOString()};","originalTextSha,...(type==='exhibitions'?{bundle:cleanBundle(p.bundle)}:{}),updatedAt:new Date().toISOString()};",'draft serialization');
 // Old clients must not silently drop a staged group into a single-record publication.
 s=one(s,"        const type=requireType(p.type),slug=requireSlug(p.slug),paths=getPaths(root,type,slug);","        return await serializeWrite(async()=>{\n        const type=requireType(p.type),slug=requireSlug(p.slug),paths=getPaths(root,type,slug);",'serialize ordinary writes');
 s=one(s,"      }\n      return json(res,404,{error:'Not found'});","        });\n      }\n      return json(res,404,{error:'Not found'});",'serialize ordinary writes end');
 s=one(s,"        if(p.confirmPublic!==true)throw apiError(422,'Please confirm public publication');","        if(p.confirmPublic!==true)throw apiError(422,'Please confirm public publication');\n        if(p.bundle?.length)throw apiError(422,'Use grouped publication for staged linked records.');",'single publication guard');
 return s;
}
export function patchEditor(s,ui){
 s=one(s,"createdNewDrafts:new Set()};","createdNewDrafts:new Set(),pendingNodes:[]};",'state');
 s=one(s,"function newRecord(){","function newRecord(){showResearch(false);state.pendingNodes=[];$('edit-form').hidden=false;$('record-id-wrap').hidden=false;",'new record');
 s=one(s,"async function openRecord(slug,draft){try{resetAnalysis();","async function openRecord(slug,draft){try{resetAnalysis();",'open record');
 s=one(s,"window.__murmurgroveWordSha=doc.wordOriginalSha||null;","showResearch(false);state.pendingNodes=draft&&Array.isArray(doc.bundle)?doc.bundle:[];$('edit-form').hidden=false;$('record-id-wrap').hidden=false;window.__murmurgroveWordSha=doc.wordOriginalSha||null;",'restore bundle');
 s=one(s,"function setDirty(v=true){","function setDirty(v=true){if(v)$('confirm-public').checked=false;",'reset confirmation');
 s=span(s,'async function makeRelationField(field){','function updateTitle(){',mark+'\n'+ui+'\n','relationship UI');
 s=one(s,"originalTextSha:window.__murmurgroveOriginalSha||null};}","originalTextSha:window.__murmurgroveOriginalSha||null,...(state.type==='exhibitions'?{bundle:state.pendingNodes}: {})};}",'bundle serialize');
 s=one(s,"if(!window.confirm('Write this record into your PUBLIC Astro content files? After GitHub Push it may be visible to everyone.'))return;const data=serialize();data.confirmPublic=true;const result=await post('/api/publish',data);",`const data=serialize();const grouped=!!data.bundle?.length;if(grouped&&data.bundle.some(n=>!n.reviewed))throw new Error('Review all new linked records first, or remove those you do not want to publish.');if(!window.confirm(grouped?'Publish the following PUBLIC local files?\\n\\n'+bundleReviewText(data)+'\\n\\nPrivate original text and other private drafts are excluded.':'Write this record into your PUBLIC Astro content files? After GitHub Push it may be visible to everyone.'))return;data.confirmPublic=true;let result;$('record-workspace').inert=true;$('switch-research').disabled=true;$('switch-record').disabled=true;document.querySelector('.sidebar').inert=true;try{result=await post(grouped?'/api/bundle-publish':'/api/publish',data);}finally{$('record-workspace').inert=false;$('switch-research').disabled=false;$('switch-record').disabled=false;document.querySelector('.sidebar').inert=false;}if(grouped){for(const n of state.pendingNodes)state.lists[n.type]=null;state.pendingNodes=[];}`, 'group publication');
 s=one(s,"state.lists[state.type]=null;await loadList();setDirty(false);warn('Saved '","state.lists[state.type]=null;await loadList();renderFields();setDirty(false);window.dispatchEvent(new Event('editor-research-open'));warn('Saved '",'refresh published UI');
 s=one(s,"pre.textContent=`TYPE: ${data.type}\\nFILE: src/data/","pre.textContent=(data.bundle?.length?bundleReviewText(data)+'\\n\\n':'')+`TYPE: ${data.type}\\nFILE: src/data/",'group preview');
 // The existing AI candidate validation stays in use; no separate private node is written.
 s=one(s,"'Create PRIVATE draft'","'Add to this Exhibition'",'candidate label');
 s=span(s,"        const result=await post('/api/candidate-draft'", "      }catch(e){notice.textContent=e.message;create.disabled=false;}",`        const result=await post('/api/new-review',{source:sourceForNew(),candidate});
        const checked=result.candidate;const field=checked.group==='people'?'artists':checked.group==='concepts'?'concepts':(!state.fields.institution&&checked.evidence?.source==='location'?'institution':'relatedInstitutions');
        await stageBundleNode(field,checked.name,slugInput.value.trim());
        state.createdNewDrafts.add(item.group+':'+slugInput.value.trim());
        notice.textContent='Added to this Exhibition. Review below before publishing.';
`,'candidate staging');
 s=one(s,"Draft created · open '+item.group+' > Private drafts to review","Added here · review in Connect",'candidate status');
 s=one(s,"await loadList();newRecord();};$('collection-tabs').append(b);","await loadList();newRecord();if(type!=='exhibitions'){$('edit-form').hidden=true;$('record-id-wrap').hidden=true;$('editor-title').textContent=LABELS[type];$('intro-note').textContent='Choose an existing record on the left to edit, or click + New record. New linked entries can be created directly in Exhibitions.';}};$('collection-tabs').append(b);",'archive landing');
 s=one(s,"boot();","$('switch-record').addEventListener('click',()=>showResearch(false));$('switch-research').addEventListener('click',()=>showResearch(true));\nboot();",'workspace tabs');
 return s;
}
export function patchHTML(s){
 s=one(s,'editor v1.1 (local)','editor v1.2 (local)','HTML version');
 s=one(s,'<section class="main-panel">','<section class="main-panel">\n    <nav class="editor-switch" aria-label="Editor workspace"><button type="button" id="switch-record" aria-pressed="true">Records</button><button type="button" id="switch-research" aria-pressed="false">Research</button></nav>\n    <div id="record-workspace">','workspace start');
 s=one(s,'<div class="form-field slug-field">','<details id="record-id-wrap"><summary>Record ID / URL (advanced)</summary><div class="form-field slug-field">','ID fold');
 s=one(s,'IDs cannot be renamed when editing an existing record.</div></div>','IDs cannot be renamed when editing an existing record.</div></div></details>','ID fold end');
 s=one(s,'<form id="edit-form" autocomplete="off"><div id="typed-fields"></div>','<form id="edit-form" autocomplete="off"><div class="bundle-phase">01 / CAPTURE</div><div id="typed-fields"></div><details id="advanced-fields-wrap"><summary>Additional record details / optional fields</summary><div id="advanced-fields"></div></details>','capture');
 s=one(s,'      <section class="analysis-section" id="analysis-section"','      <section id="connect-workspace"><div class="bundle-phase">02 / CONNECT</div><p class="micro-copy">Search existing records or create and link new people, institutions and concepts here.</p><div id="connect-fields"></div><div id="bundle-review" hidden></div></section>\n      <section class="analysis-section" id="analysis-section"','connect');
 s=one(s,'New names and concepts are only unverified proposals. Creating a candidate writes a PRIVATE draft, never a public record or a network edge.','New names and concepts are unverified proposals. Add them to this Exhibition, review the linked records above, and save or publish the group together.','proposal copy');
 s=one(s,'Every new proposal requires an exact quote, duplicate check, private draft creation and your separate publication decision.','Every new proposal requires an exact quote and duplicate check. Review each staged record and its link before grouped publication.','AI copy');
 s=one(s,'      <div class="preview-title">','      <div class="bundle-phase">03 / PUBLISH</div><div class="preview-title">','publish stage');
 s=one(s,'I reviewed this record for public publication.','I reviewed this record and any new linked records for public publication.','confirmation');
 s=one(s,'    </form>\n    <section class="research-atelier" id="research-workspace"','    </form>\n    </div>\n    <section hidden class="research-atelier" id="research-workspace"','separate research');
 s=span(s,'    <div class="afterword">','  </section>\n</main>',`    <div class="afterword"><span class="eyebrow">NEXT STEP</span><p>Review local files in GitHub Desktop, run the website build, then Commit → Push when ready. Private drafts and original text are never pushed by this editor. Historical T₀ stays untouched.</p></div>\n`,'footer help');
 s=one(s,'editor v1.1 · paste-first','editor v1.2 · exhibition-first','footer version');return s;
}
export function patchResearch(s){return one(s,'init();','window.addEventListener(\'editor-research-open\',()=>{if(token)Promise.all([loadCatalog(),loadRelations(),loadConceptMeta()]).catch(()=>{});});\ninit();','research refresh');}
export async function install(target,{apply=false}={}){
 const base=path.resolve(target),root=path.dirname(base);await fs.access(path.join(root,'src/content.config.ts'));await fs.access(path.join(root,'src/data'));
 const original=new Map(),updated=new Map();const mappings={'server.mjs':patchServer,'assets/editor.js':s=>patchEditor(s,globalThis.ui),'index.html':patchHTML,'assets/research.js':patchResearch,'assets/editor.css':s=>s+'\n'+globalThis.css};
 globalThis.ui=await read(path.join(here,'inline-ui.js'));globalThis.css=await read(path.join(here,'extra.css'));
 for(const [f,fn] of Object.entries(mappings)){const raw=await read(path.join(base,f));if(raw.includes(mark)||raw.includes('editor v1.2 (local)'))throw Error('Upgrade already applied or version differs. No files changed.');original.set(f,raw);updated.set(f,fn(raw.replace(/\r\n/g,'\n')));}
 try{await fs.access(path.join(base,'bundle.mjs'));throw Error('bundle.mjs already exists. No files changed.')}catch(e){if(e.code!=='ENOENT')throw e}
 updated.set('bundle.mjs',await read(path.join(here,'bundle.mjs')));
 const tmp=await fs.mkdtemp(path.join(base,'.upgrade-check-'));try{for(const [f,data] of updated){if(!/\.(mjs|js)$/.test(f))continue;const out=path.join(tmp,path.basename(f)+'.mjs');await fs.writeFile(out,data);const check=spawnSync(process.execPath,['--check',out],{encoding:'utf8'});if(check.status!==0)throw Error('Syntax check failed: '+f+'\n'+check.stderr);}}finally{await fs.rm(tmp,{recursive:true,force:true});}
 console.log('Validated v1.1 patch anchors and JavaScript syntax. Files to update:');for(const f of updated.keys())console.log('  '+f);
 if(!apply){console.log('Preview only. No files changed.');return;}
 const backup=path.join(base,'.private','editor-upgrade-backups','v1.1-'+new Date().toISOString().replace(/[:.]/g,'-'));for(const [f,data] of original){const out=path.join(backup,f);await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,data,{flag:'wx'});}
 const done=[];try{for(const [f,data] of updated){const dest=path.join(base,f);if(original.has(f)&&await read(dest)!==original.get(f))throw Error('Source changed during installation: '+f);if(!original.has(f)){await fs.writeFile(dest,data,{flag:'wx'});}else{const temp=dest+'.upgrade-tmp';await fs.writeFile(temp,data,{flag:'wx'});try{await fs.rename(temp,dest);}finally{await fs.rm(temp,{force:true});}}done.push(f);}}catch(e){for(const f of done.reverse())if(original.has(f))await fs.writeFile(path.join(base,f),original.get(f));else await fs.rm(path.join(base,f),{force:true});throw e;}
 console.log('Installed v1.2 locally. Backup: '+backup+'\nNo archive, website or Git files were changed. Start START-EDITOR.bat and test using a PRIVATE draft.');
}
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)){
 try{let target=process.argv[2];if(!target){try{const sibling=path.resolve(here,'../murmurgrove-editor');await fs.access(path.join(sibling,'server.mjs'));target=sibling;}catch{}}if(!target){const rl=readline.createInterface({input:process.stdin,output:process.stdout});target=(await rl.question('Paste path to existing murmurgrove-editor folder (or website root): ')).trim();rl.close();}target=target.replace(/^"|"$/g,'');try{await fs.access(path.join(target,'server.mjs'))}catch{target=path.join(target,'murmurgrove-editor')}
 await install(target);const rl=readline.createInterface({input:process.stdin,output:process.stdout});const answer=(await rl.question('Close the existing editor first. Type INSTALL to apply, or Enter to cancel: ')).trim();rl.close();if(answer==='INSTALL')await install(target,{apply:true});else console.log('Cancelled.');}catch(e){console.error(e.message);process.exitCode=1;}
}
