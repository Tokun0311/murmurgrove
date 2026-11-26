import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {installV15} from '../_upgrade-v15/install.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),target=path.resolve(here,'..');
const mark='MURMURGROVE_EDITOR_V16';
const read=p=>fs.readFile(p,'utf8');
function one(s,a,b){const i=s.indexOf(a);if(i<0||s.indexOf(a,i+a.length)>=0)throw Error('Unexpected source version: '+a.slice(0,90));return s.slice(0,i)+b+s.slice(i+a.length);}
function span(s,a,b,v){const i=s.indexOf(a),j=s.indexOf(b,i+a.length);if(i<0||j<0)throw Error('Unexpected source version: '+a);return s.slice(0,i)+v+'\n'+s.slice(j);}
export function patchEditor(s,geo){
 s=one(s,'const BUNDLE_GROUPS=',geo+'\nconst BUNDLE_GROUPS=');
 s=one(s,"async function stageBundleNode(field,name,requestedId,body=''){","async function stageBundleNode(field,name,requestedId,body='',city=''){");
 s=one(s,"kind:'other',reviewed:false});bundleLink(field,id);","kind:'other',...(type==='institutions'?{city:canonicalCity(city)}:{}),reviewed:false});bundleLink(field,id);");
 s=one(s,"const add=el('button','action-link v13-create'","const geoField=type==='institutions'?institutionCityField('',key==='institution'):null;const add=el('button','action-link v13-create'");
 s=one(s,'await stageBundleNode(key,title,requested,note.value);name.value="";id.value="";note.value="";refreshV13();','await stageBundleNode(key,title,requested,note.value,geoField?.input.value);name.value="";id.value="";note.value="";if(geoField){geoField.input.value="";geoField.input.dispatchEvent(new Event("input"));}refreshV13();');
 s=one(s,'addWrap.append(name,id,note,add);','addWrap.append(name);if(geoField)addWrap.append(geoField.wrap);addWrap.append(id,note,add);');
 s=one(s,"  const lab=el('label','micro-copy',n.type==='concepts'?", "  if(n.type==='institutions'){const city= institutionCityField(n.city||'',false,value=>{n.city=value;invalidate();});row.append(city.wrap);}\n  const lab=el('label','micro-copy',n.type==='concepts'?");
 return s;
}
export function patchHTML(s){s=one(s,'editor v1.5 (local)','editor v1.6 (local)');return one(s,'editor v1.5 · batch intake','editor v1.6 · institution geography');}
export function patchBundle(s){s=one(s,'return {type:n.type,slug:n.slug,name:n.name.trim(),body:n.body,kind:',"if(n.type==='institutions'&&n.city!=null&&(typeof n.city!=='string'||n.city.length>120||/[\\r\\n]/.test(n.city)))throw fail('Invalid institution city.');\n  return {type:n.type,slug:n.slug,name:n.name.trim(),body:n.body,...(n.type==='institutions'?{city:String(n.city||'').trim()}:{}),kind:");s=one(s,':{name:n.name},{strict:true});',':{name:n.name,city:n.city},{strict:true});');return '// '+mark+'\n'+s;}
export async function installV16(base){
 const paths=['assets/editor.js','index.html','assets/editor.css','bundle.mjs'];
 let values=await Promise.all(paths.map(f=>read(path.join(base,f)).catch(e=>{if(f==='bundle.mjs'&&e.code==='ENOENT')return '';throw e;})));
 let flags=[values[0].includes(mark),values[1].includes('editor v1.6 (local)'),values[2].includes(mark),values[3].includes(mark)];
 if(flags.every(Boolean)){console.log('Editor v1.6 ready.');return;}if(flags.some(Boolean))throw Error('Mixed v1.6 files. Restore private upgrade backup.');
 await installV15(base);values=await Promise.all(paths.map(f=>read(path.join(base,f))));
 const [editor,html,css,bundle]=values;
 if(!editor.includes('MURMURGROVE_EDITOR_V15')||!html.includes('editor v1.5 (local)')||!css.includes('MURMURGROVE_EDITOR_V15'))throw Error('Unsupported or mixed v1.5 version.');
 const geo=await read(path.join(here,'geo-ui.js'));
 const next=[patchEditor(editor.replace(/\r\n/g,'\n'),geo),patchHTML(html.replace(/\r\n/g,'\n')),css+'\n'+await read(path.join(here,'extra.css')),patchBundle(bundle.replace(/\r\n/g,'\n'))];
 const tmp=await fs.mkdtemp(path.join(base,'.v16-check-'));try{for(let i=0;i<paths.length;i++){if(!/\.(mjs|js)$/.test(paths[i]))continue;const p=path.join(tmp,path.basename(paths[i])+'.mjs');await fs.writeFile(p,next[i]);const check=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(check.status!==0)throw Error(check.stderr||'Syntax check failed');}}finally{await fs.rm(tmp,{recursive:true,force:true});}
 const backup=path.join(base,'.private','editor-upgrade-backups','v1.5-'+new Date().toISOString().replace(/[:.]/g,'-'));for(let i=0;i<paths.length;i++){const p=path.join(backup,paths[i]);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,values[i],{flag:'wx'});}
 const done=[];try{for(let i=0;i<paths.length;i++){const p=path.join(base,paths[i]);if(await read(p)!==values[i])throw Error('File changed during upgrade: '+paths[i]);const t=p+'.v16-tmp';await fs.writeFile(t,next[i],{flag:'wx'});try{await fs.rename(t,p);}finally{await fs.rm(t,{force:true});}done.push(i);}}catch(e){for(const i of done.reverse())await fs.writeFile(path.join(base,paths[i]),values[i]);throw e;}
 console.log('Editor v1.6 installed. Backup: '+backup+'\nOnly local editor program files updated.');
}
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)){try{await installV16(target);}catch(e){console.error('Upgrade stopped: '+e.message+'\nKeep the original folder and .private.');process.exitCode=1;}}
