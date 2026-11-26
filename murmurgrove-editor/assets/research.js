// murmurgrove research workspace. Local-only UI; all public claims require explicit review.
const $=id=>document.getElementById(id);
const h=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;};
const types=['exhibitions','people','institutions','concepts','writing'];
let token='',records=[],claims=[],conceptsMeta={},lastAnswer=null,wordSha='';
async function req(endpoint,data){const r=await fetch(endpoint,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json','X-Editor-Token':token}:undefined,body:data?JSON.stringify(data):undefined,cache:'no-store'});
 let p;try{p=await r.json()}catch{p={error:`Unexpected HTTP ${r.status}`}}if(!r.ok)throw Error(p.error||'Request failed');return p;}
const value=id=>$(id).value;
function status(id,msg,err=false){const n=$(id);n.textContent=msg;n.style.color=err?'#a4463d':'';}
const sitePath=entry=>entry?.type&&entry?.id?`/${entry.type}/${encodeURIComponent(entry.id)}/`:entry?.path||'/';
async function loadCatalog(){const lists=await Promise.all(types.map(type=>req('/api/records?type='+type)));records=lists.flatMap((r,i)=>r.items.map(x=>({type:types[i],id:x.slug,title:x.title,fields:x.fields})));
 for(const selector of ['link-source','link-target','concept-pick','concept-merge-from','concept-merge-to']){const n=$(selector),keep=n.value;n.replaceChildren();n.append(h('option','',['concept-pick','concept-merge-from','concept-merge-to'].includes(selector)?'Select concept…':'Choose record…'));
  for(const r of records.filter(x=>!['concept-pick','concept-merge-from','concept-merge-to'].includes(selector)||x.type==='concepts')){const opt=h('option','',`${r.type} · ${r.title}`);opt.value=`${r.type}:${r.id}`;n.append(opt);}n.value=keep;}
}
async function captureOriginal(){
 const text=$('body').value;
 if(!text.trim())return status('original-message','Paste or write some text above first.',true);
 try{
  status('original-message','Preserving an unedited local text snapshot…');
  const r=await req('/api/capture-original',{text,title:$('editor-title').textContent.slice(0,150)});
  window.__murmurgroveOriginalSha=r.sha256;
  status('original-message',`Preserved privately · SHA-256 ${r.sha256.slice(0,14)}… · plain text. You can now edit, analyze and save a draft; the original stays unchanged.`);
 }catch(e){status('original-message',e.message,true)}
}
async function importWord(){const file=$('word-file').files?.[0];if(!file)return status('word-message','Select a .docx Word document first.',true);
 if(!/\.docx$/i.test(file.name)||file.size>8*1024*1024)return status('word-message','Only .docx under 8 MB is supported. Save old .doc files as .docx.',true);
 try{status('word-message','Extracting Word text locally…');const raw=await new Promise((ok,fail)=>{const fr=new FileReader();fr.onload=()=>ok(fr.result);fr.onerror=()=>fail(fr.error);fr.readAsDataURL(file)});
  const res=await req('/api/import-word',{name:file.name,base64:String(raw).split(',')[1]});
  const current=$('body').value;if(current.trim()&&!confirm('The editor already contains text. Append the imported Word text to the end? Cancel to keep the existing text unchanged.'))return status('word-message','Original Word file was preserved locally. Editor text left unchanged.');
  $('body').value=(current.trim()?current.trimEnd()+'\n\n':'')+res.text;
  $('body').dispatchEvent(new Event('input',{bubbles:true}));wordSha=res.sha256;window.__murmurgroveWordSha=wordSha;
  status('word-message',`Original preserved locally (SHA-256 ${wordSha.slice(0,14)}…). Text copied into editor; review before saving a private draft or publishing.`);
 }catch(e){status('word-message',e.message,true);}
}
function drawResults(data){const out=$('research-answers');out.replaceChildren();out.append(h('p','micro-copy',data.summary));
 if(!data.results?.length)return;
 for(const item of data.results){const wrap=h('article','source-hit'),head=h('div','source-hit-head'),title=h('strong','',item.title),meta=h('small','',`${item.type} · ${item.id}`),quote=h('blockquote','source-quote',item.evidence);
  head.append(title,meta);wrap.append(head,quote);const row=h('div','atelier-actions');const read=h('button','action-link','Read complete source here');read.type='button';
  read.onclick=async()=>{try{const d=await req('/api/record?type='+encodeURIComponent(item.type)+'&slug='+encodeURIComponent(item.id));let details=wrap.querySelector('pre');if(details){details.remove();return}details=h('pre','source-full',`# ${d.fields.title||d.fields.name||item.title}\n\n${d.body}`);wrap.append(details);}catch(e){status('sync-message',e.message,true)}};
  const go=h('a','action-link','Open published page');go.href='https://murmurgrove.pages.dev'+sitePath(item);go.target='_blank';go.rel='noopener noreferrer';row.append(read,go);wrap.append(row);out.append(wrap);
 }
 const relevant=data.edges||[];if(relevant.length){out.append(h('h3','','Existing relations / supporting context'));
 for(const e of relevant.slice(0,18))out.append(h('p','micro-copy',`${e.source} ↔ ${e.target} · ${e.kind} (${e.provenance?.[0]?.method||'source'})`));}
}
async function ask(){const q=value('research-question').trim();if(!q)return status('sync-message','Enter a question first.',true);
 try{const d=await req('/api/ask',{question:q});lastAnswer=d;drawResults(d)}catch(e){status('sync-message',e.message,true)}}
async function runLocalAI(){const box=$('local-ai-output');box.replaceChildren();box.append(h('p','micro-copy','Reading the published evidence with your local model…'));
 try{const r=await req('/api/ask-local-ai',{question:value('research-question'),model:value('local-ai-model').trim()});box.replaceChildren();
  const heading=h('p','micro-copy','Local AI interpretation · evidence citations must be checked against the full original records');box.append(heading,h('pre','source-full',r.analysis));
  if(r.sources?.length){const list=h('div','source-results');for(let i=0;i<r.sources.length;i++){const source=r.sources[i],a=h('a','action-link',`[S${i+1}] ${source.title}`);a.href='https://murmurgrove.pages.dev'+source.path;a.target='_blank';a.rel='noopener noreferrer';a.style.marginRight='18px';list.append(a)}box.append(list)}
 }catch(e){box.replaceChildren(h('p','micro-copy',e.message));}}
async function copyResearchPrompt(){if(!value('research-question').trim())return status('sync-message','Enter a question first.',true);
 try{const p=await req('/api/grounded-prompt',{question:value('research-question')});if(!p.evidenceCount)return status('sync-message','No grounded sources matched, so no prompt was copied.',true);
  try{await navigator.clipboard.writeText(p.prompt);status('sync-message',`Copied a grounded prompt with ${p.evidenceCount} public references. Pasting it into ChatGPT sends those excerpts externally.`)}catch{const output=$('research-question');output.value=p.prompt;output.select();status('sync-message','Clipboard blocked. Prompt shown in question field, please copy manually.');}
 }catch(e){status('sync-message',e.message,true)}}
function currentClaim(){function parse(s){const m=s.match(/^([^:]+):(.+)$/);if(!m)throw Error('Select two published records');return{type:m[1],id:m[2]}}
 return{source:parse(value('link-source')),target:parse(value('link-target')),kind:value('link-kind'),evidence:value('link-evidence').trim(),reason:value('link-reason').trim()};}
async function relationPreview(){try{const r=await req('/api/relation-preview',{claim:currentClaim()});status('relation-message',`Evidence verified in ${r.claim.source.type}:${r.claim.source.id}. Relationship is still a proposal; independent factual accuracy is not externally verified.`);return true}catch(e){status('relation-message',e.message,true);return false}}
async function relationApprove(){if(!await relationPreview())return;if(!confirm('Publish this reviewed relationship to the local source ledger? This can change the present classification of older records. Nothing is pushed to GitHub until you commit.'))return;
 try{const r=await req('/api/relation-approve',{claim:currentClaim(),confirm:true});status('relation-message',`Relationship recorded (${r.event.claim.id}). Current research source graph regenerated.`);await loadRelations()}catch(e){status('relation-message',e.message,true)}}
async function loadRelations(){try{const data=await req('/api/relations');claims=data.claims||[];const out=$('active-relations');out.replaceChildren();if(!claims.length)out.append(h('p','micro-copy','No reviewed relations yet. Existing Markdown links remain indexed separately.'));
 for(const c of claims.slice(-80).reverse()){const row=h('div','source-hit'),txt=h('span','',`${c.source.type}:${c.source.id} → ${c.target.type}:${c.target.id} · ${c.kind}`),withdraw=h('button','action-link','Withdraw');row.append(txt,h('p','micro-copy',`“${c.evidence}” · ${c.reason}`),withdraw);
  withdraw.onclick=async()=>{if(!confirm('Withdraw this relation? A dated withdrawal event will preserve its history.'))return;try{await req('/api/relation-withdraw',{claimId:c.id,reason:'Withdrawn after review',confirm:true});await loadRelations()}catch(e){status('relation-message',e.message,true)}};out.append(row);}
 }catch(e){status('relation-message',e.message,true)}}
async function loadConceptMeta(){try{const r=await req('/api/concept-meta');conceptsMeta=r.concepts||{};showConcept()}catch(e){status('concept-message',e.message,true)}}
function showConcept(){const ref=value('concept-pick'),id=ref.split(':')[1],c=conceptsMeta[id]||{};$('concept-stage').value=c.status||'provisional';$('concept-aliases').value=(c.aliases||[]).join('\n');
 for(const field of ['definition','interpretation','development'])$('concept-'+field).value=c[field]||'';}
async function saveConcept(){const id=value('concept-pick').split(':')[1];if(!id)return status('concept-message','Choose a published concept first.',true);
 const payload={id,status:value('concept-stage'),aliases:value('concept-aliases').split(/\r?\n/).map(s=>s.trim()).filter(Boolean),definition:value('concept-definition'),interpretation:value('concept-interpretation'),development:value('concept-development'),confirm:true};
 if(!confirm('Save concept memory and aliases to the PUBLIC local research layer? Private Word files will not be included.'))return;
 try{const r=await req('/api/concept-meta',payload);status('concept-message',`Saved ${id}. Lifecycle: ${r.meta.status}. The current source graph is regenerated; previous source versions remain available.`);await loadConceptMeta()}catch(e){status('concept-message',e.message,true)}}
async function mergeConceptUI(){const from=value('concept-merge-from').split(':')[1],to=value('concept-merge-to').split(':')[1],reason=value('concept-merge-reason').trim();
 if(!from||!to||from===to)return status('concept-message','Select two DIFFERENT published concepts.',true);
 if(!confirm(`Merge the current classification ${from} → ${to}? Both original files and their history will remain. This action cannot be undone through this button.`))return;
 try{const r=await req('/api/concept-merge',{from,to,reason,confirm:true});status('concept-message',`Merged current classification ${r.merged.from} → ${r.merged.to}. Historical source preserved.`);await loadCatalog();await loadConceptMeta()}
 catch(e){status('concept-message',e.message,true)}}
async function sync(){if(!confirm('Regenerate current source graph from PUBLISHED records and approved relations? This will create public files locally, but not push them to GitHub.'))return;
 try{const r=await req('/api/sync-research',{confirm:true});status('sync-message',`Source layer ${r.changed?'updated':'already current'} · ${r.records} published records · ${r.relations} source-derived links · ${r.graphHash.slice(0,12)}. Historical T₀ untouched.`);await loadHistory()}catch(e){status('sync-message',e.message,true)}}
async function loadHistory(){try{const r=await req('/api/history');const out=$('source-history');out.replaceChildren();for(const x of (r.entries||[]).slice(-12).reverse())out.append(h('p','micro-copy',`${x.at} · ${x.recordCount} records · ${x.edgeCount} links · +${x.added?.length||0} / changed ${x.changed?.length||0} / removed ${x.removed?.length||0} · ${x.graphHash?.slice(0,12)}`));
 if(!r.entries?.length)out.append(h('p','micro-copy','No source-state snapshots created yet.'))}catch(e){status('sync-message',e.message,true)}}
async function init(){try{const r=await req('/api/bootstrap');token=r.token;await Promise.all([loadCatalog(),loadRelations(),loadConceptMeta()]);}catch(e){status('sync-message','Research workspace unavailable: '+e.message,true)}}
for(const [id,fn] of [['capture-original',captureOriginal],['import-word',importWord],['ask-archive',ask],['run-local-ai',runLocalAI],['copy-grounded-prompt',copyResearchPrompt],['check-relation',relationPreview],['approve-relation',relationApprove],['save-concept-meta',saveConcept],['apply-concept-merge',mergeConceptUI],['sync-research',sync],['load-research-history',loadHistory]])$(id).addEventListener('click',fn);
$('concept-pick').addEventListener('change',showConcept);
window.addEventListener('editor-research-open',()=>{if(token)Promise.all([loadCatalog(),loadRelations(),loadConceptMeta()]).catch(()=>{});});
init();
