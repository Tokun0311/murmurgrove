// MURMURGROVE_EDITOR_V15: non-interrupting notifications and bulk participant intake.
let v15ToastTimer;
function warn(text,error=false){
 const alert=$('alert'),toast=$('editor-toast');
 if(alert){alert.hidden=false;alert.className=error?'error':'';alert.textContent=String(text);}
 if(toast){clearTimeout(v15ToastTimer);toast.hidden=false;toast.dataset.status=error?'error':'notice';$('editor-toast-text').textContent=String(text);v15ToastTimer=setTimeout(()=>{toast.hidden=true;},error?11000:4200);}
 // No scrolling or focus stealing. The full message stays by Publish.
}
function clearWarn(){const a=$('alert'),t=$('editor-toast');if(a)a.hidden=true;if(t)t.hidden=true;clearTimeout(v15ToastTimer);}
function refreshLinkedUI(){for(const node of $('connect-fields').querySelectorAll('[data-field]'))node.refreshLinkedRecords?.();renderBundleReview();refreshV13();}
function parseParticipantList(raw){
 const text=String(raw||'').replace(/\r\n?/g,'\n').replace(/^\s*(?:participating artists|artists|参展艺术家|参加アーティスト)\s*[:：]\s*/i,'');
 const parts=[];let chunk='',quote='',stack=[];const opens={'(':')','（':'）','[':']','［':'］','【':'】'};
 const close=new Set(Object.values(opens));
 const flush=()=>{const v=chunk.trim().replace(/^\s*(?:[•・●]\s*|\d{1,3}[.)、]\s+)/,'').replace(/\s+/g,' ').trim();chunk='';if(v&&!/^(?:and more|and others|etc\.?|其他|等|ほか|…|\.\.\.)[.!。]?$/i.test(v))parts.push(v);};
 for(const c of text){if(quote){if(c===quote){quote='';}else chunk+=c;continue;}if(c==='"'||c==='“'){quote=c==='“'?'”':'"';continue;}if(opens[c]){stack.push(opens[c]);chunk+=c;continue;}if(close.has(c)){if(stack.pop()!==c)throw Error('Unbalanced brackets / 括号不匹配，请检查名单。');chunk+=c;continue;}if(!stack.length&&/[,，、;；\n\t]/.test(c)){flush();continue;}chunk+=c;}
 if(stack.length||quote)throw Error('Unclosed brackets or quotation marks / 请检查括号或引号。');flush();
 const seen=new Set(),names=[],duplicates=[];for(const name of parts){if(name.length>300)throw Error('One name is too long. Use one participant per line / 单个名称过长，请检查分隔符。');const key=bundleNorm(name);if(!key)continue;if(seen.has(key)){duplicates.push(name);continue;}seen.add(key);names.push(name);}
 if(names.length>300)throw Error('At most 300 names per import / 单批最多 300 个名称。');
 return {names,duplicates};
}
function participantVariants(row){const f=row.fields||{};return [row.title,row.slug,f.name,f.reading,f.sortName,...(Array.isArray(f.aliases)?f.aliases:[]),...(Array.isArray(f.alternativeNames)?f.alternativeNames:[])].map(bundleNorm).filter(Boolean);}
async function participantId(name){let id=slugify(name);if(id==='new-record'){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(name.normalize('NFKC').toLowerCase()));id='people-'+Array.from(new Uint8Array(bytes)).slice(0,8).map(b=>b.toString(16).padStart(2,'0')).join('');}return id;}
async function planParticipants(names,published,pending,drafts,linked){
 const candidates=pending.filter(n=>n.type==='people').map(n=>({slug:n.slug,title:n.name,pending:true}));const all=[...published,...candidates],occupied=new Set(all.map(x=>x.slug)),results=[];const plannedNames=new Set();
 for(const name of names){const key=bundleNorm(name),matches=all.filter(x=>participantVariants(x).includes(key));
  if(matches.length>1){results.push({name,status:'conflict',note:'多个可能匹配 / Multiple matches: '+matches.map(x=>x.title+' ('+x.slug+')').join(', ')});continue;}
  if(matches.length===1){const hit=matches[0];results.push({name,slug:hit.slug,title:hit.title,status:linked.includes(hit.slug)?'linked':hit.pending?'staged':'existing'});continue;}
  const id=await participantId(name),keys=[...new Set([key,bundleNorm(id)])];
  const draft=drafts.find(x=>x.slug===id||participantVariants(x).includes(key)||participantVariants(x).includes(bundleNorm(id)));
  if(draft){results.push({name,status:'conflict',note:'另有私人草稿 / Separate private draft: '+draft.title+' ('+draft.slug+')'});continue;}
  if(occupied.has(id)||keys.some(k=>plannedNames.has(k))||all.some(x=>participantVariants(x).includes(bundleNorm(id)))){results.push({name,status:'conflict',note:'名称或 ID 冲突 / Name or ID conflict: '+id});continue;}
  occupied.add(id);keys.forEach(k=>plannedNames.add(k));results.push({name,slug:id,title:name,status:'new'});
 }
 return results;
}
function participantSignature(rows){return JSON.stringify(rows.map(({name,slug,title,status,note})=>[name,slug,title,status,note]));}
function participantImport(box){
 const wrap=el('details','v15-bulk');wrap.append(el('summary','','批量添加艺术家 / Paste participant list'));
 const help=el('p','micro-copy','从官网复制整份名单。支持逗号、分号、换行、顿号。保留括号、& 和合作组合；不需要填写每位艺术家的简介。');
 const input=el('textarea','bundle-input');input.rows=5;input.placeholder='Miyu Hosoi, Evan Ifekoya, Jan St. Werner, …';input.setAttribute('aria-label','Paste participant names');
 const preview=el('button','action-link','Preview matches / 预览匹配');preview.type='button';
 const message=el('p','v15-bulk-message');message.setAttribute('role','status');const results=el('div','v15-bulk-results');
 const controls=el('div','v15-bulk-actions'),allButton=el('button','action-link','Select all available / 全选可添加'),noneButton=el('button','action-link','Clear selection / 取消全选'),apply=el('button','publish','Add selected / 添加所选');for(const b of [allButton,noneButton,apply])b.type='button';controls.append(allButton,noneButton,apply);controls.hidden=true;
 wrap.append(help,input,preview,message,results,controls);box.append(wrap);
 let rows=[],checks=[],run=0,parsed=null,record=null;
 function selection(){return checks.filter(x=>x.check.checked).map(x=>x.row);}
 function update(){apply.disabled=selection().length===0;apply.textContent='Add selected / 添加所选 ('+selection().length+')';}
 function reset(){run++;rows=[];checks=[];parsed=null;record=null;results.replaceChildren();controls.hidden=true;message.textContent='';preview.disabled=false;}
 input.addEventListener('input',reset);
 allButton.onclick=()=>{for(const x of checks)x.check.checked=true;update();};noneButton.onclick=()=>{for(const x of checks)x.check.checked=false;update();};
 async function freshPlan(list){const [p,d]=await Promise.all([api('/api/records?type=people'),api('/api/drafts?type=people')]);state.lists.people=p.items||[];return planParticipants(list,state.lists.people,state.pendingNodes,d.items||[],state.fields.artists||[]);}
 function show(){results.replaceChildren();checks=[];const counts={existing:0,staged:0,linked:0,new:0,conflict:0};const labels={existing:'已有 / Existing',staged:'已暂存 / Staged',linked:'已关联 / Linked',new:'新候选 / New',conflict:'冲突 / Check'};
  for(const row of rows){counts[row.status]++;const line=el('label','v15-bulk-row');line.dataset.status=row.status;const check=el('input');check.type='checkbox';check.disabled=['linked','conflict'].includes(row.status);check.checked=!check.disabled;const label=el('div','v15-bulk-name');label.append(el('strong','',row.name));if(row.title&&row.title!==row.name)label.append(el('small','',`→ ${row.title}`));if(row.note)label.append(el('small','',row.note));line.append(check,label,el('span','v15-match-status',labels[row.status]));results.append(line);if(!check.disabled){checks.push({row,check});check.onchange=update;}}
  message.textContent=`${rows.length} 个名称 · ${counts.existing} 已有 · ${counts.new} 新候选 · ${counts.linked+counts.staged} 已关联或暂存 · ${counts.conflict} 需处理 · ${parsed.duplicates.length} 重复输入已去重。`;
  controls.hidden=false;update();}
 preview.onclick=async()=>{reset();const id=run;record=state.fields;preview.disabled=true;try{const p=parseParticipantList(input.value);if(!p.names.length)throw Error('Paste at least one participant name / 请粘贴名单。');const plan=await freshPlan(p.names);if(id!==run||record!==state.fields||!wrap.isConnected)return;parsed=p;rows=plan;show();}catch(e){if(id===run)message.textContent=e.message;}finally{if(id===run)preview.disabled=false;}};
 apply.onclick=async()=>{const id=run,chosen=selection();if(!chosen.length||!parsed)return;apply.disabled=true;preview.disabled=true;try{
  const latest=await freshPlan(parsed.names);if(id!==run||record!==state.fields||state.type!=='exhibitions'||!wrap.isConnected)return;
  if(participantSignature(latest)!==participantSignature(rows)){rows=latest;show();message.textContent+=' 档案状态已变化，请重新核对后再添加。';return;}
  const incoming=chosen.filter(r=>r.status==='new');if(state.pendingNodes.length+incoming.length>200)throw Error('每篇展览最多暂存 200 个新档案 / Up to 200 new linked records per Exhibition.');
  // All validated before mutation. Names only; no invented biographies or automatic approval.
  state.pendingNodes.push(...incoming.map(r=>({type:'people',slug:r.slug,name:r.name,body:'',kind:'other',reviewed:false})));
  for(const r of chosen)bundleLink('artists',r.slug);setDirty();refreshLinkedUI();const added=new Set(chosen.map(r=>r.name));rows=rows.map(r=>added.has(r.name)?{...r,status:'linked'}:r);show();for(const x of checks)x.check.checked=false;update();
  warn(`Added ${chosen.length} participants / 已添加 ${chosen.length} 项关联 · ${incoming.length} new names need review / 个新名称待审核（发布区）。`);
 }catch(e){if(id===run)message.textContent=e.message;}finally{if(id===run){preview.disabled=false;update();}}};
}
