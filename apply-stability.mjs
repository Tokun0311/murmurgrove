import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
const marker='// MURMURGROVE_STABILITY_20261127';
const viewer='public/murmurgrove/organism/viewer.mjs';
const overlay='public/murmurgrove/organism/research-current-overlay.mjs';
const home='src/pages/index.astro';
function change(s,old,next,label){const i=s.indexOf(old);if(i<0||s.indexOf(old,i+old.length)>=0)throw Error('Source mismatch: '+label+' (nothing has been written)');return s.slice(0,i)+next+s.slice(i+old.length);}
function patchViewer(s){
 const r=(a,b,l)=>{s=change(s,a,b,l)};
 r('function project(p){const cy=Math.cos(angle),sy=Math.sin(angle),ce=Math.cos(elevation),se=Math.sin(elevation);',`${marker}
let projectionAngle=NaN,projectionElevation=NaN,cy=1,sy=0,ce=1,se=0;
function project(p){if(projectionAngle!==angle||projectionElevation!==elevation){projectionAngle=angle;projectionElevation=elevation;cy=Math.cos(angle);sy=Math.sin(angle);ce=Math.cos(elevation);se=Math.sin(elevation);}`, 'projection');
 r('function reframe(){const projected=viewPositions.map(project);',`let frameGeometry=null;
function reframe(){if(frameGeometry&&frameGeometry.positions===viewPositions&&frameGeometry.angle===angle&&frameGeometry.elevation===elevation&&frameGeometry.width===W&&frameGeometry.height===H)return;
 frameGeometry={positions:viewPositions,angle,elevation,width:W,height:H};
 const projected=viewPositions.map(project);`,'reframe');
 // Source geometry is replaced as an array; camera/viewport changes invalidate the cache.
 r('function render(now){const time=',`let renderFailures=0;
function clearTransientCamera(){
 activePointers.clear();activeGesture=null;touchPair=null;pinchGesture=null;touchOrbitTarget=null;
 panIntent=null;edgeReturnVelocity=[0,0];velocityPan=[0,0];velocityAngle=0;velocityElevation=0;
 zoomGoal=null;zoomAnchor=null;followSelected=false;relationFocusId=null;entrance=null;
 if(relationJourney)cancelRelationJourney({dismiss:true});
 canvas.style.cursor='grab';
}
function render(now){
 try{renderFrame(now);renderFailures=0;}
 catch(error){
  renderFailures++;console.error('Murmurgrove frame failed:',error);
  if(renderFailures===1){try{clearTransientCamera();angle=ENTRANCE_TARGET_ANGLE;elevation=ENTRANCE_TARGET_ELEVATION;zoom=DEFAULT_ZOOM;pan=[0,0];lastSafePan=[0,0];userFramedPan=false;showCard(null);resize();syncZoomDisplay();}catch(recoveryError){console.error('Camera recovery failed:',recoveryError);}}
  if(renderFailures>=3){const el=$('loadingError');el.style.display='block';el.textContent='Rendering interrupted. Click here to retry. Details are in the browser console.';el.style.pointerEvents='auto';el.onclick=()=>{el.style.display='none';el.onclick=null;renderFailures=0;lastFrameAt=0;requestAnimationFrame(render);};return;}
 }
 requestAnimationFrame(render);
}
function renderFrame(now){const time=`,'render wrapper');
 r(' requestAnimationFrame(render);\n}\nfunction chooseMode','}\nfunction chooseMode','single animation scheduler');
 r('lastFrameScreenNodes=pos.map((p,i)=>[nodes[i].id,Number(p[0].toFixed(4)),Number(p[1].toFixed(4))]);','lastFrameScreenNodes=pos;','defer coordinates');
 r('get screenNodes(){return lastFrameScreenNodes?.map(x=>[x[0],x[1],x[2]])||[];}','get screenNodes(){return captureScreenNodes(lastFrameScreenNodes);}','debug coordinates');
 r('async function exportPresentFrame(){',`function captureScreenNodes(pos){return pos?.map((p,i)=>[nodes[i].id,Number(p[0].toFixed(4)),Number(p[1].toFixed(4))])||[];}
async function exportPresentFrame(){`,'capture helper');
 r("  const png=canvas.toDataURL('image/png');",`  const captured={frameRenderedAt:lastFrameRenderedAt,camera:structuredClone(lastFrameCamera),cssViewport:[W,H],pixelViewport:[canvas.width,canvas.height],screenNodes:captureScreenNodes(lastFrameScreenNodes)};
  const png=canvas.toDataURL('image/png');`,'atomic capture');
 r('frameRenderedAt:lastFrameRenderedAt,\n   camera:lastFrameCamera,cssViewport:[W,H],pixelViewport:[canvas.width,canvas.height],\n   selectedId:lastFrameCamera.selectedId,screenNodes:lastFrameScreenNodes,rendererSha256:', 'frameRenderedAt:captured.frameRenderedAt,\n   camera:captured.camera,cssViewport:captured.cssViewport,pixelViewport:captured.pixelViewport,\n   selectedId:captured.camera.selectedId,screenNodes:captured.screenNodes,rendererSha256:', 'capture metadata');
 r(" canvas.addEventListener('lostpointercapture',e=>{if(activePointers.has(e.pointerId))pointerEnd(e,true);});",` canvas.addEventListener('lostpointercapture',e=>{if(activePointers.has(e.pointerId))pointerEnd(e,true);});
 window.addEventListener('blur',()=>{if(activePointers.size||activeGesture||touchPair)clearTransientCamera();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){if(activePointers.size||activeGesture||touchPair)clearTransientCamera();lastFrameAt=0;}});`,'lost gesture recovery');
 r('  const locate=requestedLocation(),firstVisit=!hasSeenEntrance();',`  const locate=requestedLocation(),firstVisit=!hasSeenEntrance();
  let desktopReload=false;
  try{const owner=window.parent!==window?window.parent:window;desktopReload=!MOBILE_HOME&&owner.performance.getEntriesByType('navigation')[0]?.type==='reload';}catch{}`,'reload detection');
 r('  }else if(!storedMemory()){','  }else if(desktopReload||!storedMemory()){','desktop reload safe camera');
 // Only lower raster resolution slightly on mobile; no gesture-time canvas resets.
 r('smallTouchViewport?1.2:1.5','smallTouchViewport?1:1.5','mobile pixel budget');
 return s;
}
function patchOverlay(s){const r=(a,b,l)=>{s=change(s,a,b,l)};
 r('  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);',`  ${marker}
  const transform=ctx.getTransform();
  const w=ctx.canvas.width/Math.max(.01,transform.a),h=ctx.canvas.height/Math.max(.01,transform.d);
  const off=(x,y,r)=>x+r<0||y+r<0||x-r>w||y-r>h;
  ctx.clearRect(0, 0, w, h);`,'overlay viewport');
 r('    ctx.beginPath();\n    ctx.moveTo(p[0], p[1]);',`    // A Bezier curve stays within its control-point convex hull.
    if(Math.max(p[0],q[0],c1[0],c2[0]) < -2 || Math.min(p[0],q[0],c1[0],c2[0]) > w+2 || Math.max(p[1],q[1],c1[1],c2[1]) < -2 || Math.min(p[1],q[1],c1[1],c2[1]) > h+2)continue;
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);`,'offscreen edges');
 r('    ctx.beginPath();\n    ctx.arc(point[0], point[1], radius, 0, Math.PI * 2);','    if(off(point[0],point[1],radius+7))continue;\n    ctx.beginPath();\n    ctx.arc(point[0], point[1], radius, 0, Math.PI * 2);','offscreen nodes');
 r('    const ebb = reduced ? 1 : .9 + .1 * Math.sin(clock / 11000 + x * .001);','    if(off(x,y,radius))continue;\n    const ebb = reduced ? 1 : .9 + .1 * Math.sin(clock / 11000 + x * .001);','offscreen glow');
 return s;}
function patchHome(s){return change(s,'  let revealTimeout;\n  organismFrame?.addEventListener(\'load\', () => {\n    // If verification fails, reveal the iframe\'s own readable error panel.\n    revealTimeout = window.setTimeout(() => organismHome?.classList.add(\'is-ready\'), 10000);\n  });',`  ${marker}
  // Arm even if the iframe load event already fired from cache.
  let revealTimeout = window.setTimeout(() => organismHome?.classList.add('is-ready'), 10000);`, 'iframe reveal fallback');}
export {patchViewer,patchOverlay,patchHome};
function main(){
 const root=path.resolve(process.argv[2]||process.cwd());
 const files=[[viewer,patchViewer],[overlay,patchOverlay],[home,patchHome]];
 const pending=files.map(([p,fn])=>{const full=path.join(root,p),old=fs.readFileSync(full,'utf8');if(old.includes(marker))return {p,full,old,next:old};const lf=old.replace(/\r\n/g,'\n');const next=fn(lf);return {p,full,old,next:old.includes('\r\n')?next.replace(/\n/g,'\r\n'):next};});
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'murmur-stability-'));
 try{for(const f of pending){if(!f.p.endsWith('.mjs'))continue;const p=path.join(temp,path.basename(f.p));fs.writeFileSync(p,f.next);const check=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(check.status!==0)throw Error(check.stderr||'Syntax check failed');}}finally{fs.rmSync(temp,{recursive:true,force:true});}
 if(process.argv.includes('--check-only')){console.log('Source anchors and JavaScript syntax verified; no files changed.');return;}
 const changed=pending.filter(f=>f.old!==f.next);if(!changed.length){console.log('Patch already applied.');return;}
 const backup=path.join(root,'.murmurgrove-stability-backup-'+new Date().toISOString().replace(/[:.]/g,'-'));
 for(const f of changed){const p=path.join(backup,f.p);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,f.old);}
 const written=[];try{for(const f of changed){written.push(f);fs.writeFileSync(f.full,f.next);}}catch(e){for(const f of written)fs.writeFileSync(f.full,f.old);throw e;}
 console.log('Patched '+changed.length+' files. Backup: '+backup);console.log('Only commit the three source files, not the backup. No archive files changed.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{main()}catch(e){console.error(e.message);process.exitCode=1;}}
