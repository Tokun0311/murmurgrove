import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const baseline='beaaa6c40f8df809ed98f002b7ab23a48ddcffe6';
const relative='public/murmurgrove/organism/viewer.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const target=path.join(root,relative);
function section(s,a,b){const i=s.indexOf(a),j=s.indexOf(b,i+a.length);if(i<0||j<0||s.indexOf(a,i+a.length)>=0)throw Error('Unexpected source section: '+a);return s.slice(i,j);}
function replace(s,a,b){if(!s.includes(a)||s.indexOf(a)!==s.lastIndexOf(a))throw Error('Unexpected source: '+a.slice(0,90));return s.replace(a,()=>b);}
function repair(s,original){
 for(const [a,b] of [['function storedMemory(){','function preprocess(){'],['  const locate=requestedLocation(),firstVisit=','  reframe();initUI();']])s=replace(s,section(s,a,b),section(original,a,b));
 // Keep the original raster quality. Off-screen culling and math caching remain.
 if(s.includes('smallTouchViewport?1:1.5'))s=replace(s,'smallTouchViewport?1:1.5','smallTouchViewport?1.2:1.5');
 if(!s.includes('smallTouchViewport?1.2:1.5'))throw Error('Unexpected pixel ratio');
 // The error handler must never overwrite the camera, selection, or saved state.
 s=replace(s,section(s,'function clearTransientCamera(){','function renderFrame(now){'),`function clearTransientCamera(){
 activePointers.clear();activeGesture=null;touchPair=null;pinchGesture=null;
 panIntent=null;canvas.style.cursor='grab';
}
function render(now){
 try{renderFrame(now);renderFailures=0;}
 catch(error){
  renderFailures++;console.error('Murmurgrove frame failed:',error);
  if(renderFailures>=3){const el=$('loadingError');el.style.display='block';el.textContent='Rendering interrupted. Click here to retry. Details are in the browser console.';el.style.pointerEvents='auto';el.onclick=()=>{el.style.display='none';el.onclick=null;renderFailures=0;lastFrameAt=0;requestAnimationFrame(render);};return;}
 }
 requestAnimationFrame(render);
}
`);
 // Assert untouched entrance/gesture constants and the complete original memory/init blocks.
 for(const [a,b] of [['function storedMemory(){','function preprocess(){'],['  const locate=requestedLocation(),firstVisit=','  reframe();initUI();'],['function cancelEntrance(){','let lastSafePan=']]){
  if(section(s,a,b)!==section(original,a,b))throw Error('Original settings differ: '+a);
 }
 return s;
}
try{
 const old=fs.readFileSync(target,'utf8');
 if(!old.includes('MURMURGROVE_STABILITY_20261127'))throw Error('Expected stability patch not found. No files changed.');
 const git=spawnSync('git',['show',baseline+':'+relative],{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024});
 if(git.status!==0)throw Error('Cannot read the original Git version. No files changed. Please check Git is installed and the repository history is available.');
 const norm=x=>x.replace(/\r\n/g,'\n');
 const next=repair(norm(old),norm(git.stdout));
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'murmurgrove-repair-'));
 const test=path.join(tmp,'viewer.mjs');fs.writeFileSync(test,next);
 const check=spawnSync(process.execPath,['--check',test],{encoding:'utf8'});
 if(check.status!==0)throw Error(check.stderr||'Syntax validation failed');
 const backup=path.join(tmp,'viewer.original.mjs');fs.writeFileSync(backup,old);
 try{fs.writeFileSync(target,old.includes('\r\n')?next.replace(/\n/g,'\r\n'):next);}catch(e){fs.writeFileSync(target,old);throw e;}
 console.log('Patched 1 file. Original camera settings verified against Git.');console.log('Backup: '+backup);console.log('Commit only '+relative+'. No archive files changed.');
}catch(e){console.error(e.message);process.exitCode=1;}
