import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {installV14} from '../_upgrade-v14/install.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),target=path.resolve(here,'..');
const mark='MURMURGROVE_EDITOR_V15';
const read=p=>fs.readFile(p,'utf8');
function one(s,a,b){const i=s.indexOf(a);if(i<0||s.indexOf(a,i+a.length)>=0)throw Error('Unexpected source version: '+a.slice(0,90));return s.slice(0,i)+b+s.slice(i+a.length);}
function span(s,a,b,v){const i=s.indexOf(a),j=s.indexOf(b,i+a.length);if(i<0||j<0)throw Error('Unexpected source version: '+a);return s.slice(0,i)+v+'\n'+s.slice(j);}
export function patchEditor(s,bulk,review){
 s=span(s,'function warn(text,error=false){','function setDirty(v=true){',bulk);
 s=one(s,"setDirty();renderFields();warn('Linked existing record:","setDirty();refreshLinkedUI();warn('Linked existing record:");
 s=one(s,'bundleLink(field,previous.slug);setDirty();renderFields();return;','bundleLink(field,previous.slug);setDirty();refreshLinkedUI();warn(\'Linked staged record: \'+previous.name);return;');
 s=one(s,'if(state.pendingNodes.length>=50)throw Error(\'Limit: 50 new linked records in one exhibition.\');','if(state.pendingNodes.length>=200)throw Error(\'Limit: 200 new linked records in one exhibition.\');');
 s=one(s,"bundleLink(field,id);setDirty();renderFields();warn('Added '","bundleLink(field,id);setDirty();refreshLinkedUI();warn('Added '");
 s=one(s,"state.fields[f]=(state.fields[f]||[]).filter(x=>x!==n.slug);}setDirty();renderFields();}","state.fields[f]=(state.fields[f]||[]).filter(x=>x!==n.slug);}setDirty();refreshLinkedUI();}");
 s=one(s,"Review it below before publication.","Review it in the Publish section before publication.");
 s=span(s,'function renderBundleReview(){','// v1.3: full concept catalogue',review);
 s=one(s,'const published=await getList(type),items=[...published,...bundleItems(type)];','const published=await getList(type);let items=[...published,...bundleItems(type)];');
 s=one(s,"const active=items.filter(x=>!meta[x.slug]?.mergedInto).sort((a,b)=>a.title.localeCompare(b.title,undefined,{sensitivity:'base'}));","const activeItems=()=>items.filter(x=>!meta[x.slug]?.mergedInto).sort((a,b)=>a.title.localeCompare(b.title,undefined,{sensitivity:'base'}));let active=activeItems();");
 s=one(s," const addWrap=el('details','v13-add');"," if(key==='artists')participantImport(box);\n const addWrap=el('details','v13-add');");
 s=one(s,'await stageBundleNode(key,title,requested,note.value);refreshV13();','await stageBundleNode(key,title,requested,note.value);name.value="";id.value="";note.value="";refreshV13();');
 s=one(s,' search.oninput=draw;drawChips();draw();return box;'," box.refreshLinkedRecords=()=>{items=[...(state.lists[type]||published),...bundleItems(type)];active=activeItems();drawChips();draw();};\n search.oninput=draw;drawChips();draw();return box;");
 s=one(s,'}if(count){await renderFields();setDirty();warn(', '}if(count){setDirty();refreshLinkedUI();warn(');
 s=one(s,"Added here · review in Connect","Added here · review in Publish");
 s=one(s,"Added to this Exhibition. Review below before publishing.","Added to this Exhibition. Review in Publish before publishing.");
 s=one(s,'boot();',"$('editor-toast-close').addEventListener('click',()=>{$('editor-toast').hidden=true;clearTimeout(v15ToastTimer);});\nboot();");
 return s;
}
export function patchHTML(s){
 s=one(s,'editor v1.4 (local)','editor v1.5 (local)');s=one(s,'editor v1.4 · clear workflow','editor v1.5 · batch intake');
 s=one(s,'<div id="alert" role="status" aria-live="polite" hidden></div>','');
 s=one(s,'<div id="editor-review-status" role="status" aria-live="polite"></div>','');
 s=one(s,'<div id="bundle-review" hidden></div>','');
 s=one(s,'<div class="bundle-phase" id="publish-phase">03 / PUBLISH · 保存与发布</div>','<div class="bundle-phase" id="publish-phase">03 / PUBLISH · 保存与发布</div><div id="bundle-review" hidden></div>');
 s=one(s,'<div class="public-warning">','<div id="editor-review-status" role="status" aria-live="polite"></div><div id="alert" hidden></div><div class="public-warning">');
 s=one(s,'review the linked records above','review the linked records in Publish');
 s=one(s,'</body>','<div id="editor-toast" role="status" aria-live="polite" hidden><span id="editor-toast-text"></span><button type="button" id="editor-toast-close" aria-label="Dismiss notification">×</button></div>\n</body>');
 return s;
}
export function patchBundle(s){return '// '+mark+'\n'+one(s,"if(!Array.isArray(input)||input.length>50)throw fail('At most 50 new linked records per exhibition.');","if(!Array.isArray(input)||input.length>200)throw fail('At most 200 new linked records per exhibition.');");}
export async function installV15(base){
 const paths=['assets/editor.js','index.html','assets/editor.css','bundle.mjs'];
 let values=await Promise.all(paths.map(f=>read(path.join(base,f)).catch(e=>{if(f==='bundle.mjs'&&e.code==='ENOENT')return '';throw e;})));
 let flags=[values[0].includes(mark),values[1].includes('editor v1.5 (local)'),values[2].includes(mark),values[3].includes(mark)];
 if(flags.every(Boolean)){console.log('Editor v1.5 ready.');return;}if(flags.some(Boolean))throw Error('Mixed v1.5 files. Restore private upgrade backup.');
 await installV14(base);values=await Promise.all(paths.map(f=>read(path.join(base,f))));
 const [editor,html,css,bundle]=values;
 if(!editor.includes('MURMURGROVE_EDITOR_V14')||!html.includes('editor v1.4 (local)')||!css.includes('MURMURGROVE_EDITOR_V14'))throw Error('Unsupported or mixed v1.4 version.');
 const bulk=await read(path.join(here,'bulk-ui.js')),review=await read(path.join(here,'review-ui.js'));
 const next=[patchEditor(editor.replace(/\r\n/g,'\n'),bulk,review),patchHTML(html.replace(/\r\n/g,'\n')),css+'\n'+await read(path.join(here,'extra.css')),patchBundle(bundle.replace(/\r\n/g,'\n'))];
 const tmp=await fs.mkdtemp(path.join(base,'.v15-check-'));try{for(let i=0;i<paths.length;i++){if(!/\.(mjs|js)$/.test(paths[i]))continue;const p=path.join(tmp,path.basename(paths[i])+'.mjs');await fs.writeFile(p,next[i]);const check=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(check.status!==0)throw Error(check.stderr||'Syntax check failed');}}finally{await fs.rm(tmp,{recursive:true,force:true});}
 const backup=path.join(base,'.private','editor-upgrade-backups','v1.4-'+new Date().toISOString().replace(/[:.]/g,'-'));for(let i=0;i<paths.length;i++){const p=path.join(backup,paths[i]);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,values[i],{flag:'wx'});}
 const done=[];try{for(let i=0;i<paths.length;i++){const p=path.join(base,paths[i]);if(await read(p)!==values[i])throw Error('File changed during upgrade: '+paths[i]);const t=p+'.v15-tmp';await fs.writeFile(t,next[i],{flag:'wx'});try{await fs.rename(t,p);}finally{await fs.rm(t,{force:true});}done.push(i);}}catch(e){for(const i of done.reverse())await fs.writeFile(path.join(base,paths[i]),values[i]);throw e;}
 console.log('Editor v1.5 installed. Backup: '+backup+'\nOnly local editor program files updated.');
}
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)){try{await installV15(target);}catch(e){console.error('Upgrade stopped: '+e.message+'\nKeep the original folder and .private.');process.exitCode=1;}}
