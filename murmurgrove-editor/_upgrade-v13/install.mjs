import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {install as installV12} from '../_upgrade-v12/install.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),target=path.resolve(here,'..');
const read=p=>fs.readFile(p,'utf8');
const MARK='// MURMURGROVE_EDITOR_V13';
function one(s,a,b){const i=s.indexOf(a);if(i<0||s.indexOf(a,i+a.length)>=0)throw Error('Unexpected source version: '+a.slice(0,70));return s.slice(0,i)+b+s.slice(i+a.length);}
export function patchEditor(s,ui){
 const start=s.indexOf('// MURMURGROVE_EXHIBITION_FIRST_V12'),end=s.indexOf('function updateTitle(){',start);if(start<0||end<0)throw Error('v1.2 UI anchor missing');s=s.slice(0,start)+MARK+'\n// MURMURGROVE_EXHIBITION_FIRST_V12\n'+ui+'\n'+s.slice(end);
 s=one(s,'function setDirty(v=true){','function setDirty(v=true){queueMicrotask(()=>refreshV13());');
 s=one(s,'function newRecord(){','function newRecord(){attemptedPublish=false;');
 s=one(s,'async function openRecord(slug,draft){try{','async function openRecord(slug,draft){try{attemptedPublish=false;');
 s=one(s,'async function publish(){try{','async function publish(){try{attemptedPublish=true;refreshV13();const issues=reviewIssues();if(issues.missing.length||issues.invalidId||issues.pending.length){if(issues.invalidId)$(\'record-id-wrap\').open=true;$(\'editor-review-status\').dataset.status=\'error\';throw Error(\'请先处理标红的必填项、Record ID 或待审核关联。 / Resolve the highlighted items before publication.\');}');
 s=one(s,"$('switch-record').addEventListener('click',()=>showResearch(false));", "for(const b of document.querySelectorAll('[data-editor-jump]'))b.addEventListener('click',()=>$(b.dataset.editorJump)?.scrollIntoView({behavior:'smooth',block:'start'}));\n$('switch-record').addEventListener('click',()=>showResearch(false));");
 // Inherited automatic analysis hides itself on non-Exhibitions; hide its new wrapper as well.
 s=one(s,"$('analysis-section').hidden=state.type!=='exhibitions';","$('analysis-section').hidden=state.type!=='exhibitions';$('analysis-fold').hidden=state.type!=='exhibitions';$('editor-stepnav').hidden=state.type!=='exhibitions';");
 return s;
}
export function patchHTML(s){
 s=one(s,'editor v1.2 (local)','editor v1.3 (local)');s=one(s,'editor v1.2 · exhibition-first','editor v1.3 · clear workflow');
 s=one(s,'<div id="alert" role="status" aria-live="polite" hidden></div>','<div id="alert" role="status" aria-live="polite" hidden></div><nav id="editor-stepnav" class="v13-stepnav" aria-label="Record sections"><button type="button" data-editor-jump="capture-phase">01 记录 / Capture</button><button type="button" data-editor-jump="connect-workspace">02 关联 / Connect</button><button type="button" data-editor-jump="publish-phase">03 发布 / Publish</button></nav><div id="editor-review-status" role="status" aria-live="polite"></div>');
 s=one(s,'<div class="bundle-phase">01 / CAPTURE</div>','<div class="bundle-phase" id="capture-phase">01 / CAPTURE · 记录</div>');
 s=one(s,'<div class="bundle-phase">02 / CONNECT</div><p class="micro-copy">Search existing records or create and link new people, institutions and concepts here.</p>','<div class="bundle-phase">02 / CONNECT · 关联</div><p class="micro-copy">直接选择已有概念，搜索人物与机构，或在这里新建。<br><span id="connect-count"></span></p>');
 s=one(s,'<section class="analysis-section" id="analysis-section"','<details id="analysis-fold"><summary>智能分析与建议 / Optional relationship analysis</summary><section class="analysis-section" id="analysis-section"');
 s=one(s,'<div class="bundle-phase">03 / PUBLISH</div>','</details><div class="bundle-phase" id="publish-phase">03 / PUBLISH · 保存与发布</div>');
 s=one(s,'Save private draft</button>','Save private draft / 保存私稿</button>');s=one(s,'Publish to local Astro files</button>','Publish local files / 写入公开文件</button>');
 return s;
}
export async function installV13(base){
 const v12marker='MURMURGROVE_EXHIBITION_FIRST_V12';let server=await read(path.join(base,'server.mjs')),editor=await read(path.join(base,'assets/editor.js')),html=await read(path.join(base,'index.html'));
 if(editor.includes(MARK)&&html.includes('editor v1.3 (local)')&&server.includes(v12marker)){console.log('Editor v1.3 ready.');return;}
 if(editor.includes(MARK)||html.includes('editor v1.3 (local)'))throw Error('Mixed v1.3 files. Restore the private upgrade backup.');
 if(!server.includes(v12marker)&&!editor.includes(v12marker)&&html.includes('editor v1.1 (local)')){await installV12(base,{apply:true});server=await read(path.join(base,'server.mjs'));editor=await read(path.join(base,'assets/editor.js'));html=await read(path.join(base,'index.html'));}
 if(!server.includes(v12marker)||!editor.includes(v12marker)||!html.includes('editor v1.2 (local)'))throw Error('Unsupported or mixed editor version. No v1.3 changes made.');
 const ui=await read(path.join(here,'inline-ui.js')),css=await read(path.join(here,'extra.css')),oldCss=await read(path.join(base,'assets/editor.css'));
 const files=[['assets/editor.js',editor,patchEditor(editor.replace(/\r\n/g,'\n'),ui)],['index.html',html,patchHTML(html.replace(/\r\n/g,'\n'))],['assets/editor.css',oldCss,oldCss+'\n'+css]];
 const tmp=path.join(base,'.v13-check-'+process.pid+'.mjs');try{await fs.writeFile(tmp,files[0][2],{flag:'wx'});const check=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});if(check.status!==0)throw Error(check.stderr||'Syntax check failed');}finally{await fs.rm(tmp,{force:true});}
 const backup=path.join(base,'.private','editor-upgrade-backups','v1.2-'+new Date().toISOString().replace(/[:.]/g,'-'));for(const [p,old] of files){const dest=path.join(backup,p);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,old,{flag:'wx'});}
 const done=[];try{for(const [p,old,next] of files){const dest=path.join(base,p);if(await read(dest)!==old)throw Error('File changed during upgrade: '+p);const temp=dest+'.v13-tmp';await fs.writeFile(temp,next,{flag:'wx'});try{await fs.rename(temp,dest);}finally{await fs.rm(temp,{force:true});}done.push([p,old]);}}catch(e){for(const [p,old] of done.reverse())await fs.writeFile(path.join(base,p),old);throw e;}
 console.log('Editor v1.3 installed. Backup: '+backup+'\nArchive, private drafts, website and GitHub untouched.');
}
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)){try{await installV13(target);}catch(e){console.error('Upgrade stopped: '+e.message+'\nKeep the original folder and .private.');process.exitCode=1;}}
