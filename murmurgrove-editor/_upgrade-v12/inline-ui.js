// Exhibition-first helpers (included by the installer in editor.js).
const BUNDLE_GROUPS={artists:'people',institution:'institutions',relatedInstitutions:'institutions',concepts:'concepts'};
const bundleNorm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');
const bundleRows=type=>state.pendingNodes.filter(n=>n.type===type);
function bundleItems(type){return bundleRows(type).map(n=>({slug:n.slug,title:n.name,fields:{},pending:true}));}
function bundleLink(field,id){if(field==='institution')state.fields[field]=id;else state.fields[field]=[...new Set([...(state.fields[field]||[]),id])];}
function removeBundleNode(n){state.pendingNodes=state.pendingNodes.filter(x=>x!==n);for(const [f,t] of Object.entries(BUNDLE_GROUPS)){if(t!==n.type)continue;if(f==='institution'){if(state.fields[f]===n.slug)state.fields[f]='';}else state.fields[f]=(state.fields[f]||[]).filter(x=>x!==n.slug);}setDirty();renderFields();}
async function stageBundleNode(field,name,requestedId,body=''){
 const type=BUNDLE_GROUPS[field];if(state.type!=='exhibitions'||!type)throw Error('Select an Exhibition first.');
 const title=String(name||'').trim();if(!title||title.length>300)throw Error('Enter a name (up to 300 characters).');
 const token=state.analysisNonce,record=state.fields;
 const items=await getList(type);let conceptMeta={};if(type==='concepts')conceptMeta=(await api('/api/concept-meta')).concepts||{};
 if(state.fields!==record||state.type!=='exhibitions')throw Error('Record changed; try again.');
 const match=items.find(x=>[x.title,x.slug,x.fields?.name,x.fields?.sortName,x.fields?.reading,...(conceptMeta[x.slug]?.aliases||[])].some(v=>bundleNorm(v)&&bundleNorm(v)===bundleNorm(title)));
 if(match){const target=conceptMeta[match.slug]?.mergedInto||match.slug;bundleLink(field,target);setDirty();renderFields();warn('Linked existing record: '+match.title+'. No duplicate created.');return;}
 const previous=bundleRows(type).find(n=>bundleNorm(n.name)===bundleNorm(title));if(previous){bundleLink(field,previous.slug);setDirty();renderFields();return;}
 let id=String(requestedId||'').trim()||slugify(title);
 if(id==='new-record'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)||id.length>100)id=window.prompt('Enter a unique English URL ID (lowercase letters, numbers, hyphens):',id==='new-record'?'':id)||'';
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)||id.length>100)throw Error('Enter a valid unique English ID.');
 if([...items,...bundleItems(type)].some(x=>x.slug===id))throw Error('That record ID already exists. Use a different ID or link the existing entry.');
 if(state.pendingNodes.length>=50)throw Error('Limit: 50 new linked records in one exhibition.');
 state.pendingNodes.push({type,slug:id,name:title,body:String(body||''),kind:'other',reviewed:false});bundleLink(field,id);setDirty();renderFields();warn('Added '+title+' to this Exhibition. Review it below before publication.');
}
function renderBundleReview(){const pane=$('bundle-review');pane.replaceChildren();pane.hidden=state.type!=='exhibitions'||!state.pendingNodes.length;if(pane.hidden)return;
 pane.append(el('h3','',`New linked records · ${state.pendingNodes.length}`),el('p','micro-copy','These entries stay private with this Exhibition until all are reviewed and you choose Publish. Only write facts or clearly labelled interpretations you want to make public.'));
 for(const n of state.pendingNodes){const row=el('section','bundle-node');row.append(el('strong','',n.name),el('small','micro-copy',`${n.type} / ${n.slug}`));
  if(n.type==='people'){const lab=el('label','micro-copy','Person type');const select=el('select','bundle-input');for(const k of ['other','artist','collective','curator','writer']){const op=el('option','',k);op.value=k;select.append(op);}select.value=n.kind;select.onchange=()=>{n.kind=select.value;n.reviewed=false;approve.checked=false;setDirty();};lab.append(select);row.append(lab);}
  const lab=el('label','micro-copy',n.type==='concepts'?'Definition / your interpretation (optional)':'Verified description or source (optional)');const area=el('textarea','bundle-input');area.rows=3;area.value=n.body;area.oninput=()=>{n.body=area.value;n.reviewed=false;approve.checked=false;setDirty();};lab.append(area);row.append(lab);
  const confirm=el('label','confirmation');const approve=el('input');approve.type='checkbox';approve.checked=n.reviewed;approve.onchange=()=>{n.reviewed=approve.checked;setDirty();};confirm.append(approve,document.createTextNode(' I reviewed this record and its relationship for public use.'));row.append(confirm);
  const remove=el('button','action-link','Remove candidate & links');remove.type='button';remove.onclick=()=>{if(window.confirm('Remove this staged candidate and its links? Existing archive files are unaffected.'))removeBundleNode(n);};row.append(remove);pane.append(row);
 }
}
async function makeRelationField(field){
 const [key,label,kind]=field,type=BUNDLE_GROUPS[key],multi=key!=='institution';const box=el('div','relation-field');box.append(el('div','form-label',label));
 const published=await getList(type),items=[...published,...bundleItems(type)];const meta=type==='concepts'?(await api('/api/concept-meta')).concepts||{}:{};
 const active=items.filter(x=>!meta[x.slug]?.mergedInto);const chips=el('div','chips'),search=el('input','relation-search'),list=el('div','relation-list');search.type='search';search.placeholder='Search or enter a new name…';search.setAttribute('aria-label',label);box.append(chips,search,list);
 const selected=()=>new Set(multi?(state.fields[key]||[]):state.fields[key]?[state.fields[key]]:[]);
 const drawChips=()=>{chips.replaceChildren();for(const id of selected()){const item=items.find(x=>x.slug===id);const b=el('button','chip bundle-chip',(item?.title||id)+(item?.pending?' · NEW':'')+' ×');b.type='button';b.onclick=()=>{if(multi)state.fields[key]=(state.fields[key]||[]).filter(v=>v!==id);else state.fields[key]='';setDirty();drawChips();draw();};chips.append(b);}};
 const draw=()=>{list.replaceChildren();const q=bundleNorm(search.value);if(!q){list.hidden=true;return;}list.hidden=false;for(const item of active.filter(x=>[x.title,x.slug,...(meta[x.slug]?.aliases||[])].some(v=>bundleNorm(v).includes(q))).slice(0,40)){const b=el('button','bundle-result',item.title+(item.pending?' · NEW':''));b.type='button';b.onclick=()=>{bundleLink(key,item.slug);setDirty();drawChips();search.value='';draw();};list.append(b);}if(!list.childElementCount)list.append(el('p','micro-copy','No matches. Create a new linked record below.'));};
 const add=el('button','action-link','+ Create & link new');add.type='button';add.onclick=async()=>{try{const name=search.value.trim()||window.prompt('Name of the new '+type.slice(0,-1)+':','');if(!name)return;await stageBundleNode(key,name);}catch(e){warn(e.message,true);}};search.oninput=draw;box.append(add);drawChips();draw();return box;
}
function renderFields(){const box=$('typed-fields'),connect=$('connect-fields'),advanced=$('advanced-fields');box.replaceChildren();connect.replaceChildren();advanced.replaceChildren();const type=state.type;
 $('connect-workspace').hidden=type!=='exhibitions';$('advanced-fields-wrap').hidden=type==='concepts';
 const optional=new Set(['verification','exhibitionEnd','reading','sortName','locationType','address','addressStatus','addressSource','latitude','longitude','venueName','venueAddress','venueStatus','associatedProject','tags']);
 for(const field of SCHEMA[type]){if(BUNDLE_GROUPS[field[0]]&&type==='exhibitions'){const node=el('div','relation-placeholder');connect.append(node);makeRelationField(field).then(rendered=>node.replaceWith(rendered)).catch(e=>warn(e.message,true));}else (optional.has(field[0])?advanced:box).append(makeField(field));}renderBundleReview();
}
function bundleReviewText(data){const lines=[`Exhibition: src/data/exhibitions/${data.slug}.md`];for(const n of data.bundle||[])lines.push(`NEW ${n.type}/${n.slug}.md — ${n.name} (${n.reviewed?'reviewed':'NOT REVIEWED'})`);lines.push('Linked IDs: '+Object.entries(BUNDLE_GROUPS).map(([k])=>`${k}: ${Array.isArray(data.fields[k])?data.fields[k].join(', '):data.fields[k]||'none'}`).join('\n'));return lines.join('\n');}
function showResearch(show){$('research-workspace').hidden=!show;$('record-workspace').hidden=show;$('switch-research').setAttribute('aria-pressed',String(show));$('switch-record').setAttribute('aria-pressed',String(!show));if(show)window.dispatchEvent(new Event('editor-research-open'));}
