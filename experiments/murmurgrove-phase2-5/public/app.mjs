import {deriveGeometry,verifyScene,sha256Canonical} from './adapter.mjs';
import {NativeWebGL2Renderer} from './renderer-webgl2.mjs';
import {pickProxy,verifyNavigation,relatedRecords,restoreMemory,MEMORY_KEY} from './navigation.mjs';
import {contextFor,selectionSourceIds,locatorData,locatorSVG} from './situated-reading.mjs';
const canvas=document.querySelector('#body'),status=document.querySelector('#status'),stats=document.querySelector('#stats');
const slider=document.querySelector('#time'),timeLabel=document.querySelector('#timeLabel');
const state={variant:'A',phase:0,camera:{azimuth:.7,elevation:.23,zoom:1,target:[0,0,0]},blind:false,ui:{navOpen:false,settingsOpen:false}};
let renderer=null,manifest=null,scenes=null,lastStats=null,nav=null,selected=null,hovered=null;
const panel=document.querySelector('#detail'),picker=document.querySelector('#archivePicker'),search=document.querySelector('#archiveSearch');
const archiveToggle=document.querySelector('#archiveToggle'),settingsToggle=document.querySelector('#settingsToggle');
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const recordById=id=>nav?.records.find(r=>r.id===id);
function saveMemory(){try{sessionStorage.setItem(MEMORY_KEY,JSON.stringify({schema:MEMORY_KEY,camera:state.camera,phase:state.phase,variant:state.variant,selected}));}catch{}}
function openRecord(id){const r=recordById(id);if(!r||!r.path||r.quarantined)return;saveMemory();location.href='https://tow-archive.pages.dev'+r.path;}
function syncUI(){
 document.body.classList.toggle('nav-open',state.ui.navOpen);
 document.body.classList.toggle('settings-open',state.ui.settingsOpen);
 archiveToggle?.setAttribute('aria-pressed',String(state.ui.navOpen));
 settingsToggle?.setAttribute('aria-pressed',String(state.ui.settingsOpen));
 archiveToggle.textContent=state.ui.navOpen?'×':'⌕';
 settingsToggle.textContent=state.ui.settingsOpen?'×':'⚙';
}
function setNavOpen(value){state.ui.navOpen=!!value;if(state.ui.navOpen)state.ui.settingsOpen=false;syncUI();if(state.ui.navOpen)search?.focus();}
function setSettingsOpen(value){state.ui.settingsOpen=!!value;if(state.ui.settingsOpen)state.ui.navOpen=false;syncUI();}
function humanLabel(item,r,link,fiber){
 if(r)return r.title;
 if(link)return 'Declared relation';
 if(fiber)return 'Activated tensile fiber';
 if(item.kind==='pulse')return 'Transient pulse chamber';
 if(item.kind==='core')return 'Sustained propulsion core';
 return 'Archive material';
}
function detailIntro(item,r,link,fiber){
 if(r)return r.quarantined?'Pending verification background material':'Real archive projection';
 if(link)return 'Declared metadata relation';
 if(fiber)return `Tension ${Number.isFinite(Number(fiber.tension))?Number(fiber.tension).toFixed(2):'—'}`;
 return item.kind==='pulse'?'Observation-driven pulse':'Sustained internal propulsion';
}
function showPanel(item){
 selected=item;panel.hidden=!item;document.body.classList.toggle('detail-open',!!item);applySelection();
 if(!item)return;
 const r=item.kind==='record'?recordById(item.id):null;
 const link=item.kind==='metadata'?nav.metadataLinks.find(l=>`metadata:${l.from}|${l.to}`===item.id):null;
 const fiber=item.kind==='fiber'?scenes[state.phase].fibers.find(f=>f.id===item.id):null;
 const transient=item.kind==='pulse'||item.kind==='core';
 const context=contextFor(item,nav,scenes[state.phase]);
 const title=humanLabel(item,r,link,fiber),subtitle=detailIntro(item,r,link,fiber);
 const sourceIds=r?[r.id]:link?[link.from,link.to]:fiber?[fiber.from,fiber.to]:[];
 const organIndex=transient?Number(item.id.split(':')[1]):-1;
 const organ=transient?(item.kind==='pulse'?scenes[state.phase].pulseChambers[organIndex]:scenes[state.phase].propulsionCores[organIndex]):null;
 const nearby=organ?scenes[state.phase].nodes.filter(n=>recordById(n.id)).map(n=>({id:n.id,d:Math.hypot(...n.displayPosition.map((v,i)=>v-organ.position[i]))})).sort((a,b)=>a.d-b.d).slice(0,5):[];
 const nearbyButtons=nearby.map(n=>`<button data-record="${escapeHTML(n.id)}">${escapeHTML(recordById(n.id).title)}</button>`).join('');
 const relations=r?relatedRecords(nav,r.id):[];
 const relationButtons=sourceIds.filter(id=>id!==r?.id).map(id=>{const other=recordById(id);return other?`<button data-record="${escapeHTML(id)}">${escapeHTML(other.title)}</button>`:''}).join('');
 const related=relations.map(l=>{const other=recordById(l.other);return other?`<button data-record="${escapeHTML(other.id)}">${escapeHTML(other.title)}</button>`:''}).join('');
 panel.innerHTML=`<div class="detailHead"><div><div class="detailMeta">${escapeHTML(r?.kind||item.kind)}</div><h2>${escapeHTML(title)}</h2></div><button class="closeDetail" id="closeDetail" aria-label="关闭">×</button></div><p class="role">${escapeHTML(context?.role||'Archive material')}</p><p class="state">${escapeHTML(subtitle)}</p><div id="locatorSlot"></div><p id="locatorLegend">绿色：所选组织 · 蓝色：当前相机目标 · 点击剪影返回整体视野</p>${r?.occurredOn?`<p class="state">${escapeHTML(r.occurredOn)}</p>`:''}${r?.path&&!r.quarantined?`<button class="openPage" id="openPage">阅读原文 ↗</button>`:''}${relationButtons?`<h3>Direct relation</h3><div class="related">${relationButtons}</div>`:''}${related?`<h3>Declared links</h3><div class="related">${related}</div>`:''}${nearbyButtons?`<h3>Anatomical vicinity</h3><div class="related">${nearbyButtons}</div>`:''}`;
 refreshLocator();
 panel.querySelector('#locatorSlot')?.addEventListener('click',()=>{cameraReset();update();refreshLocator();});
 panel.querySelector('#locatorSlot')?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();cameraReset();update();refreshLocator();}});
 panel.querySelector('#closeDetail')?.addEventListener('click',()=>showPanel(null));
 panel.querySelector('#openPage')?.addEventListener('click',()=>openRecord(r.id));
 panel.querySelectorAll('[data-record]').forEach(b=>b.addEventListener('click',()=>showPanel({kind:'record',id:b.dataset.record})));
 saveMemory();
}
function pickAt(e){if(!scenes||!nav)return null;const rect=canvas.getBoundingClientRect();return pickProxy(scenes[state.phase],nav,state.camera,rect.width,rect.height,e.clientX-rect.left,e.clientY-rect.top);}
function fillPicker(filter=''){if(!nav)return;const q=filter.toLowerCase();const rows=nav.records.filter(r=>(r.title+' '+r.id).toLowerCase().includes(q));picker.innerHTML='<option value="">Browse 181 records…</option>'+rows.map(r=>`<option value="${escapeHTML(r.id)}">${escapeHTML(r.kind)} · ${escapeHTML(r.title)}${r.quarantined?' [needs review]':''}</option>`).join('');}
function applySelection(){if(!renderer||!scenes)return;
 const derived=deriveGeometry(scenes[state.phase],state.variant,nav);
 const ids=new Set(selectionSourceIds(selected,scenes[state.phase]));
 if(ids.size){for(const strand of derived.strands){const source=strand.sourceId;
  const materialId=source.startsWith('deposit:')?source.slice(8):source.startsWith('veil:')?source.slice(5).replace(/:(?:shadow|membrane)$/,''):source;
  const active=ids.has(source)||ids.has(materialId)||[...ids].some(id=>source===id||source.startsWith(id+':'));
  strand.alpha*=active?1.35:.28;
 }}
 renderer.setGeometry(derived);
}
function refreshLocator(){const slot=panel.querySelector('#locatorSlot');if(slot&&selected&&scenes&&nav){slot.innerHTML=locatorSVG(locatorData(scenes[state.phase],state.camera,selected,nav));}}
let cameraTween=null;
function animateCamera(now){
 if(cameraTween){const q=Math.min(1,(now-cameraTween.start)/950),ease=q*q*(3-2*q);
  state.camera.target=cameraTween.from.map((v,i)=>v+(cameraTween.to[i]-v)*ease);
  state.camera.zoom=cameraTween.zoomFrom+(cameraTween.zoomTo-cameraTween.zoomFrom)*ease;
  if(q===1)cameraTween=null;refreshLocator();
 }
 requestAnimationFrame(animateCamera);
}
requestAnimationFrame(animateCamera);
function focusNearest(e){
 const scene=scenes?.[state.phase];if(!scene)return;
 const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*2-1,y=1-(e.clientY-rect.top)/rect.height*2;
 const c=state.camera,dist=3.5/c.zoom,ce=Math.cos(c.elevation),se=Math.sin(c.elevation),ca=Math.cos(c.azimuth),sa=Math.sin(c.azimuth);
 const eye=[c.target[0]+sa*ce*dist,c.target[1]+se*dist,c.target[2]+ca*ce*dist];
 const forward=c.target.map((v,i)=>v-eye[i]),fn=Math.hypot(...forward),f=forward.map(v=>v/fn);
 const right=[ca,0,-sa],up=[-sa*se,ce,-ca*se];let best=null,bestDist=.14;
 const candidates=[...scene.nodes.map(n=>n.displayPosition),...scene.pulseChambers.map(p=>p.position),...scene.propulsionCores.map(p=>p.position)];
 for(const pos of candidates){if(!pos)continue;const delta=pos.map((v,i)=>v-eye[i]);const depth=delta.reduce((a,v,i)=>a+v*f[i],0);
  if(depth<=.01)continue;const aspect=rect.width/rect.height,scale=Math.tan(Math.PI/6)*depth;
  const px=delta.reduce((a,v,i)=>a+v*right[i],0)/(scale*aspect),py=delta.reduce((a,v,i)=>a+v*up[i],0)/scale;
  const d=Math.hypot(px-x,py-y);if(d<bestDist){bestDist=d;best=pos;}
 }
 if(best){cameraTween={from:[...c.target],to:[...best],zoomFrom:c.zoom,zoomTo:Math.min(10,Math.max(3,c.zoom*2)),start:performance.now()};}
}
const phases=['T0','T1','T2'];
const fatal=e=>{document.querySelector('#fatal').style.display='block';document.querySelector('#fatal').textContent=`Phase 2.5 blocked: ${e.message}`;status.textContent='FAILED CLOSED';window.__MURMUR_ERROR__=e.message;};
function update(){if(!renderer||!scenes)return;const s=scenes[state.phase];const derived=deriveGeometry(s,state.variant,nav);
 renderer.setGeometry(derived);renderer.setCamera(state.camera);if(selected)applySelection();refreshLocator();slider.value=String(state.phase);
 timeLabel.textContent=['T₀','T₁','T₂'][state.phase];
 for(const b of document.querySelectorAll('[data-variant]'))b.classList.toggle('active',b.dataset.variant===state.variant);
 status.textContent=`${s.phase} · ${state.variant}\n${s.nodes.length} materials · ${s.fibers.length} fibers\n${s.pulseChambers.length} pulses · ${s.propulsionCores.length} cores`;
 window.__MURMUR_STATE__={phase:s.phase,variant:state.variant,snapshotHash:s.snapshotHash,manifestHash:manifest.manifestHash,
  geometrySourceHash:derived.snapshotHash,renderer:lastStats?.renderer??'initializing',counts:derived.sourceCounts,
  camera:{...state.camera},blind:state.blind};
}
function setBlind(value){state.blind=value;document.body.classList.toggle('blind',value);if(window.__MURMUR_STATE__)window.__MURMUR_STATE__.blind=value;}
function cameraReset(){cameraTween=null;state.camera.azimuth=.7;state.camera.elevation=.23;state.camera.zoom=1;state.camera.target=[0,0,0];}
async function init(){
 const get=async name=>{const r=await fetch(`./data/${name}.json`,{cache:'no-store'});if(!r.ok)throw Error(`Missing ${name}.json`);return r.json();};
 manifest=await get('manifest');if(manifest.mode!=='SIMULATED_SANDBOX')throw Error('Invalid manifest mode');
 const {manifestHash,...body}=manifest;if(await sha256Canonical(body)!==manifestHash)throw Error('Manifest hash mismatch');
 scenes=await Promise.all(phases.map(get));for(const scene of scenes)await verifyScene(scene,manifest);
 nav=await get('navigation');await verifyNavigation(nav,manifest);for(const scene of scenes){const ids=new Set(nav.records.map(r=>r.id));if(scene.nodes.some(n=>!ids.has(n.id)&&!n.id.startsWith('writing:simulated')))throw Error('Scene contains unknown archive ID');}
 const memory=restoreMemory(sessionStorage.getItem(MEMORY_KEY));if(memory){Object.assign(state.camera,memory.camera);state.phase=memory.phase;state.variant=memory.variant;selected=memory.selected;}fillPicker();
 const rendererParam=new URLSearchParams(location.search).get('renderer');
 if(rendererParam!=='native'){
  try{const three=import('./renderer-three.mjs').then(m=>m.createThreeRenderer(canvas));
   renderer=await Promise.race([three,new Promise((_,reject)=>setTimeout(()=>reject(Error('Three.js load timeout')),3000))]);}
  catch(e){console.warn('Three.js CDN unavailable; using native WebGL2 fallback:',e);renderer=new NativeWebGL2Renderer(canvas);}
 }else renderer=new NativeWebGL2Renderer(canvas);
 update();if(selected)showPanel(selected);window.__MURMUR_READY__=true;syncUI();
}
for(const b of document.querySelectorAll('[data-variant]'))b.addEventListener('click',()=>{state.variant=b.dataset.variant;update();});
slider.addEventListener('input',()=>{state.phase=Number(slider.value);showPanel(null);update();saveMemory();});
document.querySelector('#reset').addEventListener('click',()=>{cameraReset();update();});
document.querySelector('#blind').addEventListener('click',()=>setBlind(!state.blind));
document.querySelector('#perf').addEventListener('click',()=>{stats.style.display=stats.style.display==='block'?'none':'block';});
archiveToggle?.addEventListener('click',()=>setNavOpen(!state.ui.navOpen));
settingsToggle?.addEventListener('click',()=>setSettingsOpen(!state.ui.settingsOpen));
window.addEventListener('keydown',e=>{if(['a','b','c'].includes(e.key.toLowerCase())){state.variant=e.key.toUpperCase();update();}
 else if(['1','2','3'].includes(e.key)){state.phase=Number(e.key)-1;update();}
 else if(e.key.toLowerCase()==='h')setBlind(!state.blind);
 else if(e.key.toLowerCase()==='r'){cameraReset();update();}
 else if(e.key==='Escape'){setBlind(false);setNavOpen(false);setSettingsOpen(false);}
 else if(e.key==='/'){e.preventDefault();setNavOpen(true);} 
});
let drag=null;
canvas.addEventListener('pointerdown',e=>{cameraTween=null;drag={x:e.clientX,y:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag)return;state.camera.azimuth+=(e.clientX-drag.x)*.007;
 state.camera.elevation=Math.max(-1.45,Math.min(1.45,state.camera.elevation+(e.clientY-drag.y)*.007));
 drag={x:e.clientX,y:e.clientY,moved:true};refreshLocator();});
canvas.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const hit=pickAt(e);if(hit)showPanel(hit);else showPanel(null);}drag=null;});
canvas.addEventListener('dblclick',e=>{focusNearest(e);});
canvas.addEventListener('pointermove',e=>{if(drag)return;const hit=pickAt(e);canvas.style.cursor=hit?'pointer':'grab';hovered=hit;const r=hit?.kind==='record'?recordById(hit.id):null;canvas.title=r?.title|| (hit?.kind==='metadata'?'Declared relation':hit?.kind==='fiber'?'Activated fiber':'');});
picker.addEventListener('change',()=>{if(picker.value){showPanel({kind:'record',id:picker.value});setNavOpen(false);}});
search.addEventListener('input',()=>fillPicker(search.value));
window.addEventListener('pagehide',saveMemory);
canvas.addEventListener('wheel',e=>{e.preventDefault();state.camera.zoom=Math.max(1,Math.min(10,state.camera.zoom*Math.exp(-e.deltaY*.0013)));refreshLocator();},{passive:false});
window.addEventListener('murmurgrove:frame',e=>{lastStats=e.detail;stats.textContent=`${e.detail.renderer}\n${e.detail.fps} FPS · ${e.detail.drawCalls} draws · ${e.detail.triangles} triangles\nzoom ${e.detail.zoom?.toFixed(2)}×`;if(window.__MURMUR_STATE__)window.__MURMUR_STATE__.renderer=e.detail.renderer;
 window.__MURMUR_FRAME__=e.detail;});
init().catch(fatal);
