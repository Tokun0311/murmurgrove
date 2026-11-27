import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
const root=path.resolve(process.argv[2]||process.cwd());
const dir=fs.existsSync(path.join(root,'murmurgrove-editor','server.mjs'))?path.join(root,'murmurgrove-editor'):root;
const paths=[path.join(dir,'assets','editor.js'),path.join(dir,'server.mjs')];
const [oldUI,oldServer]=paths.map(p=>fs.readFileSync(p,'utf8'));
if(oldUI.includes('MG_CONNECTION_DRAFT_V1')&&oldServer.includes('MG_CONNECTION_DRAFT_V1')){console.log('Already updated.');process.exit(0);}
if(oldUI.includes('MG_CONNECTION_DRAFT_V1')||oldServer.includes('MG_CONNECTION_DRAFT_V1'))throw Error('Partial update detected. Restore backup first.');
function replace(s,a,b){if(s.indexOf(a)<0||s.indexOf(a)!==s.lastIndexOf(a))throw Error('Unsupported source version; no files changed: '+a.slice(0,90));return s.replace(a,()=>b);}
const ui=String.raw`// MG_CONNECTION_DRAFT_V1
function associationEditor(type,record,onChange){
 const wrap=el('div','association-editor');const specs=type==='exhibitions'?[['linkedExhibitions','exhibitions','Related exhibitions / 相关展览'],['linkedWriting','writing','Related writing / 相关写作']]:[['linkedPeople','people','People / 人物'],['linkedInstitutions','institutions','Institutions / 机构'],['linkedExhibitions','exhibitions','Exhibitions / 展览'],['linkedConcepts','concepts','Concepts / 概念'],['linkedWriting','writing','Writing / 写作']];
 wrap.append(el('p','micro-copy','仅选择已核实的关联；新档案先保存为私人草稿。 / Select confirmed associations only; new records are private drafts until published.'));
 for(const [key,target,label] of specs){
  const section=el('section','relation-field');section.append(el('h3','form-label',label));const chips=el('div','chips'),search=el('input','relation-search'),list=el('div','relation-list');search.type='search';search.placeholder='搜索 / Search '+target;search.setAttribute('aria-label',label);section.append(chips,search,list);wrap.append(section);
  let rows=[],drafts=[],meta={},ready=false,creating=false;const owner=state.fields;
  const selected=()=>new Set(record[key]||[]);
  const self=id=>target===type&&id===(record===state.fields?state.slug:record.slug);
  const choose=(id,remove=false)=>{if(state.fields!==owner||(!remove&&self(id)))return;const ids=selected();if(remove)ids.delete(id);else ids.add(id);record[key]=[...ids];onChange();refreshV13();draw();};
  const variants=r=>[...participantVariants(r),...(meta[r.slug]?.aliases||[]).map(bundleNorm),...rows.filter(x=>meta[x.slug]?.mergedInto===r.slug).flatMap(x=>[...participantVariants(x),...(meta[x.slug]?.aliases||[]).map(bundleNorm)])];
  const allRows=()=>{const all=[...drafts.map(r=>({...r,privateDraft:true})),...rows,...state.pendingNodes.filter(n=>n.type===target).map(n=>({slug:n.slug,title:n.name,fields:n,pending:true}))];if(target==='exhibitions'&&state.type==='exhibitions'&&state.slug)all.push({slug:state.slug,title:state.fields.title||state.slug});return [...new Map(all.map(x=>[x.slug,x])).values()].filter(r=>!meta[r.slug]?.mergedInto);};
  const addWrap=el('details','v13-add'),summary=el('summary','','+ 新建并关联 / Create & link');addWrap.append(summary);
  const name=el('input','bundle-input');name.placeholder='名称 / Name';name.setAttribute('aria-label','New '+target+' name');
  const aliases=el('input','bundle-input');aliases.placeholder='其他语言名称 / Other names (optional)';aliases.setAttribute('aria-label','Other names');
  const note=el('textarea','bundle-input');note.rows=2;note.placeholder='简短说明 / Description (optional)';note.setAttribute('aria-label','Description');
  const add=el('button','action-link v13-create','Create & link / 新建并关联');add.type='button';add.disabled=true;
  addWrap.append(name);if(['people','institutions','concepts'].includes(target))addWrap.append(aliases);addWrap.append(note,el('p','micro-copy','先保存当前草稿，再单独审核发布关联草稿，最后发布当前记录。 / Save this draft, publish the linked draft separately, then publish this record.'),add);section.append(addWrap);
  const load=async()=>{const [p,d,m]=await Promise.all([api('/api/records?'+qs({type:target})),api('/api/drafts?'+qs({type:target})),target==='concepts'?api('/api/concept-meta'):Promise.resolve({})]);rows=(p.items||[]).filter(r=>target!=='writing'||r.fields?.draft!==true);drafts=d.items||[];meta=m.concepts||{};ready=true;add.disabled=creating;draw();};
  function draw(){chips.replaceChildren();list.replaceChildren();const ids=selected(),all=allRows();for(const id of ids){const row=all.find(r=>r.slug===id);const b=el('button','chip bundle-chip',(row?.title||id)+(row?.privateDraft?' · DRAFT':'')+' ×');b.type='button';b.onclick=()=>choose(id,true);chips.append(b);}const q=bundleNorm(search.value);const visible=all.filter(r=>q&&variants(r).some(v=>v.includes(q))&&!self(r.slug)).sort((a,b)=>a.title.localeCompare(b.title)).slice(0,100);for(const row of visible){const b=el('button','bundle-result',(ids.has(row.slug)?'✓ ':'＋ ')+row.title+(row.privateDraft?' · DRAFT / 草稿':''));b.type='button';b.setAttribute('aria-pressed',String(ids.has(row.slug)));b.onclick=()=>choose(row.slug,ids.has(row.slug));list.append(b);}if(ready&&q&&!all.some(r=>variants(r).includes(q))){const b=el('button','action-link','+ Create “'+search.value.trim()+'”');b.type='button';b.onclick=()=>{addWrap.open=true;name.value=search.value.trim();name.focus();};list.append(b);}}
  summary.addEventListener('click',()=>{if(!addWrap.open&&!name.value)name.value=search.value.trim();});
  add.onclick=async()=>{if(!ready||creating)return;creating=true;add.disabled=true;try{
    const title=name.value.trim()||search.value.trim();if(!title||title.length>300||!bundleNorm(title))throw Error('Enter a valid name / 请输入有效名称。');
    await load();if(state.fields!==owner||!section.isConnected)throw Error('Record changed; try again.');
    const other=aliases.value.split(/[,，]/).map(v=>v.trim()).filter(Boolean),keys=new Set([title,...other].map(bundleNorm));
    const matches=allRows().filter(r=>variants(r).some(v=>keys.has(v)));
    if(matches.length>1)throw Error('Multiple matching records; choose an existing record.');
    if(matches.length===1){if(self(matches[0].slug))throw Error('Cannot link a record to itself.');choose(matches[0].slug);warn('Linked existing record / 已关联现有档案');}
    else{let slug=slugify(title);if(slug==='new-record')slug=unicodeId(target,title);if(target==='exhibitions')slug=niceDate()+'-'+slug;
      const fields={...blankFields(target),...(['people','institutions'].includes(target)?{name:title}:{title}),...(['people','institutions','concepts'].includes(target)?{alternativeNames:other}:{}),...(target==='people'?{kind:'other'}:{})};
      if(target==='exhibitions'){delete fields.visitedOn;fields.engagement='';fields.recordedOn=niceDate();}
      if(allRows().some(r=>r.slug===slug)||self(slug))throw Error('Record ID conflict; use another name.');
      await post('/api/draft',{type:target,slug,fields,body:note.value,createOnly:true});
      if(state.fields!==owner||!section.isConnected){warn('Private draft created; current record changed, so no link was added.');return;}
      drafts.push({slug,title,fields});state.drafts[target]=null;choose(slug);warn('Private draft created and linked / 已新建私人草稿并关联。');
    }
    name.value='';aliases.value='';note.value='';search.value='';addWrap.open=false;draw();
  }catch(e){warn(e.message,true);}finally{creating=false;add.disabled=!ready;}};
  search.oninput=draw;load().catch(e=>warn(e.message,true));draw();
 }return wrap;
}
`;
const start=oldUI.indexOf('function associationEditor('),end=oldUI.indexOf('function renderBundleReview()',start);
if(start<0||end<0||!oldUI.slice(start,end).includes('const specs=')||!oldUI.includes('function unicodeId(')||!oldUI.includes('function participantVariants('))throw Error('Unsupported editor version; no files changed.');
let newUI=oldUI.slice(0,start)+ui+oldUI.slice(end);
const saveAnchor="state.fields=data.fields;state.body=data.body;$('slug').disabled=true;$('record-mode').textContent='03 / PRIVATE DRAFT';setDirty(false);";
newUI=replace(newUI,saveAnchor,saveAnchor.replace('setDirty(false);','renderFields();setDirty(false);'));
const serverAnchor="          await saveAtomic(file,JSON.stringify(data,null,2)+'\\n');return json(res,200,{ok:true,kind:'draft',relativePath:";
const guard=String.raw`          // MG_CONNECTION_DRAFT_V1
          if(p.createOnly===true){
            await manager.assertAvailable(type,slug);
            const name=String(fields.name||fields.title||'').trim();
            if(!name||name.length>300)throw apiError(422,'Enter a name (up to 300 characters).');
            const norm=v=>String(v||'').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,'');
            const variants=f=>[f.name,f.title,f.nativeName,f.reading,f.sortName,...(f.alternativeNames||[])].map(norm).filter(Boolean);
            const keys=new Set(variants(fields));if(!keys.size)throw apiError(422,'Enter a valid name.');
            const publicRows=await recordList(root,type);
            const meta=type==='concepts'?await readConceptMeta(root):{};
            if(publicRows.some(row=>row.slug===slug||[...variants(row.fields),...(meta[row.slug]?.aliases||[]).map(norm)].some(v=>keys.has(v))))throw apiError(409,'A matching archive record already exists. Search and link it instead.');
            const dir=path.dirname(file);await fsp.mkdir(dir,{recursive:true});
            for(const fn of await fsp.readdir(dir)){if(!fn.endsWith('.json'))continue;const old=JSON.parse(await fsp.readFile(path.join(dir,fn),'utf8'));if(old.slug===slug||variants(old.fields||{}).some(v=>keys.has(v)))throw apiError(409,'A matching private draft already exists. Search and link it instead.');}
            try{await fsp.writeFile(file,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});}catch(e){if(e.code==='EEXIST')throw apiError(409,'Private draft already exists');throw e;}
            return json(res,201,{ok:true,kind:'draft',slug});
          }
`;
const newServer=replace(oldServer,serverAnchor,guard+serverAnchor);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mg-connections-'));
try{for(const [i,content] of [newUI,newServer].entries()){const p=path.join(temp,i+'.mjs');fs.writeFileSync(p,content);const check=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(check.status!==0)throw Error(check.stderr||'Syntax check failed');}}finally{fs.rmSync(temp,{recursive:true,force:true});}
const backup=path.join(os.homedir(),'murmurgrove-editor-backups','connections-'+new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(backup,{recursive:true});fs.writeFileSync(path.join(backup,'editor.js'),oldUI);fs.writeFileSync(path.join(backup,'server.mjs'),oldServer);
try{fs.writeFileSync(paths[0],newUI);fs.writeFileSync(paths[1],newServer);}catch(e){fs.writeFileSync(paths[0],oldUI);fs.writeFileSync(paths[1],oldServer);throw e;}
console.log('Updated editor.js and server.mjs. Backup: '+backup+'\nRestart Editor. No Git actions performed.');
