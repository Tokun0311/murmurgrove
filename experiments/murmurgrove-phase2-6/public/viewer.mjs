/** Murmurgrove Phase 2.6.8 · Readable directional flow / Real-baseline filament viewer.
 * One filament per verified non-quarantined metadata reference. ZERO invented semantic edges.
 * No synthetic T1/T2, life.writing or propulsion sources. Phase1B.4 T0 seed only.
 * Motion modifies optical positions without editing sources or claiming life-event history.
 */
import {mangroveControls,panForCursorZoom,easePanHome} from './organic-interaction.mjs';
import {EMERALD} from './emerald-palette.mjs';
import {cubicBezierAt,flowSamplesForRelation} from './relation-flow.mjs';
import {deriveInteriorQuietPositions,quietParticlePosition} from './quiet-particles.mjs';
import {viewDrag,calmMagnifiedMotion} from './camera-gestures.mjs';
import {MOVEMENT_RATE,BREATH_RATE,opticalTime,breathingTime,visibleOverviewMotion} from './movement-pacing.mjs';
import {datedExhibitionLedger,observationMonthGroups,monthObservationContext} from './observation-history.mjs';
import {verifyChronicle,verifySelectedSources,readVerifiedSourceState} from './version-chronicle.mjs';
import {sourceStructure,validateStructureCounts,SOURCE_READING_MODE} from './source-structure.mjs';
import {verifyOpticalFrameIndex,verifyFrameEvidence,opticalFramePayload} from './optical-frames.mjs';
import {canonicalJSON} from './version-chronicle.mjs';
import {LIVED_KINDS,makeLivedDraft,validateSealedLivedEvidence,verifyLivedIndex,referencedLivedTraces} from './lived-events.mjs';
import {LIFE_RULE_VERSION,deriveLifeMorphology,lifeRecordMap,applyLifeOffset,eventReconstructionTimes} from './life-morphology.mjs';
import {verifyLifeStateIndex,verifyLifeCapture} from './life-checkpoints.mjs';
import {verifyWithdrawalIndex,withdrawalSet,filterWithdrawnEvidence,lifeCaptureIncludesWithdrawal} from './withdrawals.mjs';
const $=id=>document.getElementById(id);
const canvas=$('stage'),ctx=canvas.getContext('2d',{alpha:false}),roles={
 concept:['Direction field / 概念方向场',EMERALD.roles.concept],exhibition:['Observation chamber / 展览观测腔体',EMERALD.roles.exhibition],
 person:['Relational synapse / 人物传导节点',EMERALD.roles.person],institution:['Institutional anchor / 机构锚点 · 未激活',EMERALD.roles.institution],writing:['Tension tissue / 写作张力组织',EMERALD.roles.writing]
};
const cl=(v,a,b)=>Math.min(b,Math.max(a,v));
const TAU=13,ZOOM_MIN=.65,ZOOM_MAX=24,BASELINE_HASH='62372e469ead425dd43fc16e737ea40cd48ce5a0188a87b868d1bee62c8ba9d3';
const memoryKey='murmurgrove.phase2.6.readonly.session';
let records=[],links=[],nodes=[],nodeMap=new Map(),nodeIndex=new Map(),neighborData=[],pulseNeighbors=[],components=[],mainIds=new Set(),isolated=new Set(),viewPositions=[],componentById=new Map();
let manifest,baseline,nav,snapshot,ready=false,angle=.63,elevation=.20,zoom=.65,mode='Whole',selected=null,followSelected=false,viewHash='';
let observationLedger=[],observationGroups=[],historyMonth=null,historyOpen=false,historyTab='visits',activeHistoryContext=null;
let chronicleIndex=null,verifiedCheckpointFiles=new Set(),selectedCheckpointId=null;
let sourceView=null,versionReadingBusy=false,versionRequest=0;
let opticalFrameIndex=null,chosenOpticalFrame=null,frameLoadRequest=0,lastFrameRenderedAt=null,renderShaCache=null,lastFrameScreenNodes=null,lastFrameCamera=null;
let livedIndex=null,livedEvidence=[],livedTraces=new Map(),withdrawalIndex=null,withdrawnIds=new Set();
// Source-authenticated event-driven optical morphology. No fabricated life events.
let lifeNowState=null,lifeActiveState=null,lifeFields=new Map(),lifePreviewEvent=null,lifePreviewAsOf=null,lifeStateIndex=null,lifeCheckpointRequest=0;
let W=1,H=1,dpr=1,baseScale=1,center=[0,0],pan=[0,0],pendingPanNorm=null,lastPointer=null,lastFpsAt=0,frames=0,fps=0,opTime=0,pointerType='mouse',lastFrameAt=0;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function loadJSON(file){const r=await fetch('./data/'+file+'.json',{cache:'no-store'});if(!r.ok)throw Error(`${file}: HTTP ${r.status}`);return r.json();}
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
async function sha(x,{ordered=false}={}){const bytes=new TextEncoder().encode(JSON.stringify(ordered?x:canonical(x)));return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function shaRawText(value){const bytes=new TextEncoder().encode(value);return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function loadLifeCheckpointIndex(){const r=await fetch('./data/life-states/index.json',{cache:'no-store'});if(!r.ok)throw Error('Life checkpoint index HTTP '+r.status);return r.json();}
async function loadWithdrawalIndex(){const r=await fetch('./data/withdrawals/index.json',{cache:'no-store'});if(!r.ok)throw Error('Withdrawals: HTTP '+r.status);return r.json();}
async function loadLivedIndex(){const r=await fetch('./data/lived-events/index.json',{cache:'no-store'});if(!r.ok)throw Error('Lived ledger: HTTP '+r.status);return r.json();}
async function loadOpticalFrameIndex(){const r=await fetch('./data/optical-frames/index.json',{cache:'no-store'});if(!r.ok)throw Error('Optical index: HTTP '+r.status);return r.json();}
async function loadChronicle(){const response=await fetch('./data/chronicle/index.json',{cache:'no-store'});if(!response.ok)throw Error('Chronicle: HTTP '+response.status);return response.json();}
function componentGroups(allNodes,edges){const ids=new Set(allNodes.map(n=>n.id));const adj=new Map([...ids].map(id=>[id,new Set()]));
 for(const e of edges){if(!ids.has(e.from)||!ids.has(e.to))throw Error('Unknown endpoint');adj.get(e.from).add(e.to);adj.get(e.to).add(e.from);}
 const seen=new Set(),groups=[];for(const id of ids){if(seen.has(id))continue;const stack=[id],group=[];seen.add(id);
  while(stack.length){const a=stack.pop();group.push(a);for(const b of adj.get(a))if(!seen.has(b)){seen.add(b);stack.push(b);}}
  groups.push(group.sort());}
 return groups.sort((a,b)=>b.length-a.length||a[0].localeCompare(b[0]));}
function storedMemory(){try{const s=JSON.parse(sessionStorage.getItem(memoryKey)||'null');
 if(!s||s.sourceHash!==BASELINE_HASH||!Number.isFinite(s.zoom)||s.zoom<ZOOM_MIN||s.zoom>ZOOM_MAX||!['Whole','Growth','Movement'].includes(s.mode))return;
 if(Number.isFinite(s.angle))angle=s.angle;if(Number.isFinite(s.elevation))elevation=cl(s.elevation,-1.2,1.2);
 zoom=s.zoom;mode=s.mode;selected=s.selected&&nodeMap.has(s.selected)?s.selected:null;
  if(typeof s.historyMonth==='string'&&observationGroups.some(g=>g.key===s.historyMonth))historyMonth=s.historyMonth;
 if(['visits','versions','frames','acts','life'].includes(s.historyTab))historyTab=s.historyTab;
 followSelected=Boolean(selected&&s.followSelected&&zoom>1);
 if(Array.isArray(s.panNorm)&&s.panNorm.length===2&&s.panNorm.every(x=>Number.isFinite(x)&&Math.abs(x)<20)){
  pendingPanNorm=s.panNorm; if(W>1&&H>1){pan=[s.panNorm[0]*W,s.panNorm[1]*H];pendingPanNorm=null;}
 }
}catch{}}
function saveMemory(){try{sessionStorage.setItem(memoryKey,JSON.stringify({sourceHash:BASELINE_HASH,angle,elevation,zoom,mode,selected,followSelected,historyMonth,historyTab,panNorm:[pan[0]/Math.max(W,1),pan[1]/Math.max(H,1)]}));}catch{}}
function preprocess(){
 records=nav.records.filter(r=>!r.quarantined);
 nodes=snapshot.nodes.map(n=>({...n,record:records.find(r=>r.id===n.id)}));nodeMap=new Map(nodes.map(n=>[n.id,n]));nodeIndex=new Map(nodes.map((n,i)=>[n.id,i]));
 links=nav.metadataLinks.filter(l=>nodeMap.has(l.from)&&nodeMap.has(l.to)&&!l.activated);
 observationLedger=datedExhibitionLedger(records);observationGroups=observationMonthGroups(observationLedger);
 components=componentGroups(nodes,links);mainIds=new Set(components[0]);isolated=new Set(components.filter(g=>g.length===1).flat());
 componentById=new Map(components.flatMap((group,i)=>group.map(id=>[id,i])));
 const quietLocations=deriveInteriorQuietPositions(nodes,mainIds,isolated);
 viewPositions=nodes.map(n=>quietLocations.get(n.id)||n.displayPosition);
 if(snapshot.fibers.length||snapshot.propulsionCores.length||snapshot.pulseChambers.length)throw Error('The renderer requires genuine silent T0, not synthetic T1/T2');
 if(baseline.baselineProjectionHash!==BASELINE_HASH||nav.baselineProjectionHash!==BASELINE_HASH)throw Error('Baseline mismatch');
 if(nodes.length!==174||links.length!==158||isolated.size!==20||mainIds.size!==123)throw Error('Unexpected real archive topology; refresh the baseline deliberately');
 const sigma=.55;
 neighborData=nodes.map((n,i)=>{
  const p=viewPositions[i],neighbors=[];
  for(let j=0;j<nodes.length;j++){if(j===i)continue;
   if(componentById.get(n.id)!==componentById.get(nodes[j].id))continue;
   const q=viewPositions[j],dist2=(p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2;
   if(dist2<sigma*sigma){const weight=Math.exp(-dist2/(2*(sigma*.47)**2));neighbors.push({j,weight});}}
  const linkNeighbors=links.filter(e=>e.from===n.id||e.to===n.id).map(e=>nodeIndex.get(e.from===n.id?e.to:e.from)).filter(i=>i!==undefined);
  let tangent=[0,0,0],tot=0;
  for(const j of linkNeighbors){for(let k=0;k<3;k++)tangent[k]+=(viewPositions[j][k]-p[k]);tot++;}
  for(const v of neighbors){const q=viewPositions[v.j];for(let k=0;k<3;k++)tangent[k]+=(q[k]-p[k])*v.weight*.24;tot+=v.weight*.24;}
  const norm=Math.hypot(...tangent)||1;tangent=tangent.map(v=>v/norm);
  return {neighbors,tangent,density:neighbors.reduce((sum,n)=>sum+n.weight,0)};
 });
 // Bounded local pulse geometry, precomputed once from real exhibition positions.
 pulseNeighbors=nodes.map((n,i)=>nodes.flatMap((p,j)=>{if(p.kind!=='exhibition'||isolated.has(n.id)||isolated.has(p.id)||componentById.get(n.id)!==componentById.get(p.id))return [];
  const dx=viewPositions[i][0]-viewPositions[j][0],dy=viewPositions[i][1]-viewPositions[j][1],dz=viewPositions[i][2]-viewPositions[j][2];
  const d2=dx*dx+dy*dy+dz*dz;if(d2>.55*.55)return [];
  return [{record:p,dist:Math.sqrt(d2),weight:Math.exp(-d2/(2*.23*.23))}];}));
}
function daySpan(date){if(!date||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date))return null;
 const start=Date.parse(date+'T00:00:00Z');if(!Number.isFinite(start))return null;
 const utcToday=Date.parse(new Date().toISOString().slice(0,10)+'T00:00:00Z');
 return Math.floor((utcToday-start)/86400000);
}
/** Visual observational kernel; not life-event activation. Never threshold-eligible. */
let glowDay=null,glowById=new Map();
function exhibitionGlow(n){
 if(n.kind!=='exhibition')return 0;
 const today=new Date().toISOString().slice(0,10);
 if(today!==glowDay){glowDay=today;glowById=new Map();
  for(const item of nodes){if(item.kind!=='exhibition')continue;
   const days=daySpan(item.record?.occurredOn);
   glowById.set(item.id,days===null||days<0?0:Math.exp(-days/TAU));
  }
 }
 return glowById.get(n.id)||0;
}
function project(p){const cy=Math.cos(angle),sy=Math.sin(angle),ce=Math.cos(elevation),se=Math.sin(elevation);
 const x=p[0]*cy-p[2]*sy,z=p[0]*sy+p[2]*cy;
 return [x,p[1]*ce-z*se,z*ce+p[1]*se];}
function reframe(){const projected=viewPositions.map(project);
 const xs=projected.map(p=>p[0]),ys=projected.map(p=>p[1]);
 const xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
 center=[(xmin+xmax)/2,(ymin+ymax)/2];baseScale=Math.min((W*.89)/Math.max(.3,xmax-xmin),(H*.58)/Math.max(.3,ymax-ymin));
}
function coords(p){const a=project(p),scale=baseScale*zoom/ZOOM_MIN;
 return [W*.5+pan[0]+(a[0]-center[0])*scale,H*.48+pan[1]-(a[1]-center[1])*scale,a[2]];}
function gaussian(n,p,time){
 const quietTime=time,breathClock=breathingTime(time,mode),waveClock=opticalTime(time,mode);
 const entry=neighborData[n],data=nodes[n],main=mainIds.has(data.id),isol=isolated.has(data.id);
 if(isol)return quietParticlePosition(data.id,p,quietTime); // independent and uncoupled, no acceleration
 const depth=entry.density,phase=Math.atan2(entry.tangent[1],entry.tangent[0]);
 // Traveling, space-dependent direction-field phase: neighbors do not all shake in place.
 // The configured Movement wave clock keeps a low base frequency for legible propagation.
 const localWave=Math.sin(waveClock*.18 - p[0]*3.5 - p[1]*1.7 + phase*.22);
 const breathing=Math.sin(breathClock*.32+phase*.20)*(.0022+Math.min(.005,depth*.00025));
 const amplitude=main?(mode==='Movement'?.0054:.0045):.0028;
 const direction=entry.tangent;
 // Deliberately slow the tiny node displacement: the fast directional flow lives
 // on source-backed Bézier curves, not in untrackable high-frequency jitter.
 const u=Math.sin(breathClock*.43+phase+p[0]*2.8+p[2]*.7);
 const v=Math.cos(breathClock*.38+phase*.9+p[1]*3.4);
 return [p[0]+direction[1]*amplitude*(.45*u+.55*localWave)+direction[0]*breathing,
  p[1]-direction[0]*amplitude*(.45*v+.55*localWave)+direction[1]*breathing,
  p[2]+(main?amplitude*.40:amplitude*.10)*localWave];
}
function positions(time){return nodes.map((n,i)=>{
 const recordState=lifeFields.get(n.id);
 const lived=applyLifeOffset(viewPositions[i],recordState);
 const rest=coords(lived),moving=coords(gaussian(i,lived,time));
 return visibleOverviewMotion(rest,calmMagnifiedMotion(rest,moving,zoom),zoom,mode);
 });}
function avgColor(a,b){return a;} // no blending of identities, relation style expresses evidence only
function drawBackground(time,pos){
 ctx.fillStyle=EMERALD.paper;ctx.fillRect(0,0,W,H);
 // Optical density derived from nodes only. No line may appear without a real relation.
 for(let i=0;i<pos.length;i++){
  const n=nodes[i],point=pos[i],centerMember=mainIds.has(n.id);
  if(!centerMember)continue;
  const d=neighborData[i].density;if(d<.8)continue;
  const spread=(mode==='Growth'?20:mode==='Movement'?23:19)*Math.sqrt(zoom/ZOOM_MIN);
  const radius=cl(spread*(.75+Math.min(2.8,d*.13)),9,160);
  const gradient=ctx.createRadialGradient(point[0],point[1],1,point[0],point[1],radius);
  const quietLens=selected&&isolated.has(selected)&&zoom>=8?.16:1;
  const power=(mode==='Movement'?.022:mode==='Growth'?.026:.023)*Math.min(1.25,d/3)*quietLens;
  gradient.addColorStop(0,`rgba(${EMERALD.veil.center},${power})`);gradient.addColorStop(.54,`rgba(${EMERALD.veil.mid},${power*.35})`);gradient.addColorStop(1,`rgba(${EMERALD.veil.edge},0)`);
  ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(point[0],point[1],radius,0,Math.PI*2);ctx.fill();
 }
}
function drawLinks(pos,time){
 const breathClock=breathingTime(time,mode);
 time=breathClock; // slow organic shape breathing, never fast local twitch
 const quietLens=selected&&isolated.has(selected)&&zoom>=8?cl(1-(zoom-8)/14,.10,1):1;
 const fieldScreen=neighborData.map(v=>{const p=project(v.tangent);return [p[0],-p[1]];});
 // 158 true, unactivated metadata relations. Multiple hairline passes still
 // reference the SAME source link and share the exact two real endpoint IDs.
 links.forEach((l,index)=>{
  const a=nodeMap.get(l.from),b=nodeMap.get(l.to),ai=nodeIndex.get(l.from),bi=nodeIndex.get(l.to);
  const p=pos[ai],q=pos[bi],ageA=daySpan(a.record?.occurredOn),ageB=daySpan(b.record?.occurredOn),age=ageA??ageB??0;
  const old=mode==='Growth'&&age>90;
  const historyAlpha=activeHistoryContext?(activeHistoryContext.linkIndices.has(index)?2.5:.22):1;
  const sourceAlpha=(mode==='Growth'?.34:mode==='Movement'?.14:.21)*quietLens*historyAlpha;
  const ebb=.91+.09*Math.sin(breathClock*.27+index*.14);
  // Only visual thickness changes, NEVER mechanical tension. Writing is silent.
  for(let k=0;k<3;k++){
   const [p1,p2]=mangroveControls(p,q,fieldScreen[ai],fieldScreen[bi],k,mode,time);
   const alpha=sourceAlpha*(k===1?.52:.20)*ebb;
   ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.bezierCurveTo(p1[0],p1[1],p2[0],p2[1],q[0],q[1]);
   ctx.lineWidth=k===1?.58:.32;
   ctx.strokeStyle=old?`rgba(${EMERALD.traces.aged},${alpha})`:`rgba(${EMERALD.traces.living},${alpha})`;
   ctx.stroke();
  }
 });
}
/** One or two extremely small optical glints travel ON each verified metadata
 * relationship. No free-floating dot clouds and no inferred or fake lines.
 * The moving glints signify a reading mode, not an activated life event.
 */
function drawRelationFlow(pos,time){
 const strandTime=breathingTime(time,mode); // same Bézier controls as drawLinks
 if(selected&&isolated.has(selected)&&zoom>=12)return; // isolated close-up: no unrelated glints
 const fieldScreen=neighborData.map(v=>{const p=project(v.tangent);return [p[0],-p[1]];});
 links.forEach((link,index)=>{
  if(activeHistoryContext&&!activeHistoryContext.linkIndices.has(index))return;
  const ai=nodeIndex.get(link.from),bi=nodeIndex.get(link.to);
  if(ai===undefined||bi===undefined)return;
  const a=pos[ai],b=pos[bi];
  // Both the moving light and its trail are sampled ON this one verified link.
  const [c1,c2]=mangroveControls(a,b,fieldScreen[ai],fieldScreen[bi],1,mode,strandTime);
  const recent=Math.max(exhibitionGlow(nodes[ai]),exhibitionGlow(nodes[bi]),
    datedLocalPulse(nodes[ai],time),datedLocalPulse(nodes[bi],time));
  // flowSamplesForRelation receives REAL seconds. It applies the configured optical
  // speed exactly once, preventing the 100× aliasing of Phase 2.6.7.
  for(const sample of flowSamplesForRelation(index,time,mode,recent)){
   const [x,y]=cubicBezierAt(a,c1,c2,b,sample.t);
   if(x<0||x>W||y<0||y>H)continue;
   const color=sample.pulse?EMERALD.glows.localPulse:EMERALD.traces.particle;
   if(mode==='Movement'&&sample.tail>0){
    // Short, soft directional wake makes the trajectory legible at 65%.
    // It is only an optical sample of this already-declared metadata link.
    const start=Math.max(0,sample.t-sample.tail);
    if(sample.t>start+.0001){
     ctx.beginPath();
     for(let j=0;j<=5;j++){
      const t=start+(sample.t-start)*j/5;
      const v=cubicBezierAt(a,c1,c2,b,t);
      if(j===0)ctx.moveTo(v[0],v[1]);else ctx.lineTo(v[0],v[1]);
     }
     ctx.lineWidth=Math.min(1.45,.70*Math.pow(zoom/ZOOM_MIN,.10));
     ctx.lineCap='round';
     ctx.strokeStyle=`rgba(${color},${(sample.alpha*.58).toFixed(4)})`;
     ctx.stroke();
    }
   }
   ctx.beginPath();ctx.arc(x,y,sample.radius*Math.pow(zoom/ZOOM_MIN,.12),0,Math.PI*2);
   ctx.fillStyle=`rgba(${color},${sample.alpha})`;ctx.fill();
  }
 });
}
/** Static, checksum-verified SOURCE reading on the pinned T0 coordinate reference.
 * This is deliberately NOT physiological playback or an archived organism image.
 * Omitted new records have no certified T0 coordinates: never invent any.
 */
function drawSourceReading(){
 ctx.fillStyle=EMERALD.paper;ctx.fillRect(0,0,W,H);
 if(!sourceView)return;
 const visual=sourceView.structure;
 const pById=new Map([...visual.projectedIds].map(id=>[id,coords(viewPositions[nodeIndex.get(id)])]));
 const fieldScreen=neighborData.map(v=>{const p=project(v.tangent);return [p[0],-p[1]];});
 ctx.save();
 for(const edge of visual.projectedEdges){
  const ai=nodeIndex.get(edge.from),bi=nodeIndex.get(edge.to),a=pById.get(edge.from),b=pById.get(edge.to);
  if(!a||!b)continue;
  const [u,v]=mangroveControls(a,b,fieldScreen[ai],fieldScreen[bi],1,'Whole',0);
  const isNew=visual.addedLinks.has(edge.key);
  ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.bezierCurveTo(u[0],u[1],v[0],v[1],b[0],b[1]);
  ctx.lineWidth=isNew?1.05:.68;ctx.strokeStyle=`rgba(${isNew?EMERALD.nodes.selected:EMERALD.traces.living},${isNew?.69:.29})`;
  ctx.stroke();
 }
 for(const [id,p] of pById){
  if(p[0]<-30||p[0]>W+30||p[1]<-30||p[1]>H+30)continue;
  const added=visual.addedIds.has(id),picked=selected===id;
  const radius=picked?4:added?2.8:1.7;
  ctx.beginPath();ctx.arc(p[0],p[1],radius,0,Math.PI*2);
  ctx.fillStyle=`rgba(${EMERALD.nodes.selected},${added?.92:.66})`;ctx.fill();
  if(added||picked){ctx.beginPath();ctx.arc(p[0],p[1],radius+(picked?6:3),0,Math.PI*2);ctx.lineWidth=.8;ctx.strokeStyle=`rgba(${EMERALD.nodes.selected},${picked?.76:.40})`;ctx.stroke();}
 }
 ctx.restore();
}
function glowAt(x,y,r,alpha,color){const gradient=ctx.createRadialGradient(x,y,0,x,y,r);
 gradient.addColorStop(0,`rgba(${color},${alpha})`);gradient.addColorStop(.27,`rgba(${color},${alpha*.38})`);gradient.addColorStop(1,`rgba(${color},0)`);
 ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=gradient;ctx.fill();}
/** Nearby source-verified exhibition observations drive optical wave density.
 * Only real visitedOn dates enter this bounded Gaussian field. No archive edges.
 */
function datedLocalPulse(n,time){
 if(mode!=='Movement')return 0;
 time=opticalTime(time,mode);
 let response=0;
 for(const p of pulseNeighbors[nodeIndex.get(n.id)]){
  const amplitude=exhibitionGlow(p.record);if(amplitude<.012)continue;
  response+=amplitude*p.weight*(.5+.5*Math.sin(time*1.2-p.dist*8.0));
 }
 return Math.min(1,response);
}
function drawNodes(pos,time){
 for(let i=0;i<nodes.length;i++){
  const n=nodes[i],p=pos[i],r=n.record,island=isolated.has(n.id),d=neighborData[i].density;
  if(p[0]<-50||p[0]>W+50||p[1]<-50||p[1]>H+50)continue;
  const glow=exhibitionGlow(n),pulse=glow*(mode==='Movement'?1.55:mode==='Growth'?.27:.78);
  const aged=daySpan(n.record?.occurredOn);
  if(mode==='Growth'&&n.kind==='exhibition'&&aged!==null&&aged>90){
   const archivalAgeOnly=cl(aged/330,0,1);
   glowAt(p[0],p[1],cl((9+archivalAgeOnly*15)*Math.sqrt(zoom/ZOOM_MIN),8,56),archivalAgeOnly*.072,EMERALD.glows.sediment);
  }
  if(pulse>.01){
   const radius=cl((15+glow*27)*(mode==='Movement'?1.65:1)*Math.sqrt(zoom/ZOOM_MIN),11,110);
   glowAt(p[0],p[1],radius,cl(pulse*.53,0,.36),EMERALD.glows.observation);
   glowAt(p[0],p[1],radius*.37,Math.min(.27,pulse*.42),EMERALD.glows.observationCore);
  }
  const selectedHere=selected===n.id;
  if(activeHistoryContext&&activeHistoryContext.exhibitions.has(n.id)){
   glowAt(p[0],p[1],cl(14*Math.sqrt(zoom/ZOOM_MIN),11,40),.13,EMERALD.glows.observationCore);
   ctx.beginPath();ctx.arc(p[0],p[1],cl(5*Math.pow(zoom/ZOOM_MIN,.22),5,12),0,Math.PI*2);
   ctx.strokeStyle=`rgba(${EMERALD.nodes.selected},.55)`;ctx.lineWidth=.8;ctx.stroke();
  }
  const sz=island?1.8:mode==='Movement'?1.34:1.16;
  const rad=cl((sz+(selectedHere?1.4:0))*Math.pow(zoom/ZOOM_MIN,.23),.8,5);
  ctx.beginPath();ctx.arc(p[0],p[1],rad,0,Math.PI*2);
  ctx.fillStyle=r?.kind==='concept'?`rgba(${EMERALD.nodes.concept},.61)`:r?.kind==='exhibition'?`rgba(${EMERALD.nodes.exhibition},${.28+.55*glow})`:
    r?.kind==='writing'?`rgba(${EMERALD.nodes.writing},.75)`:r?.kind==='person'?`rgba(${EMERALD.nodes.person},.48)`:`rgba(${EMERALD.nodes.institution},.48)`;ctx.fill();
  if(selectedHere){ctx.strokeStyle=`rgba(${EMERALD.nodes.selected},.76)`;ctx.lineWidth=1.0;ctx.beginPath();ctx.arc(p[0],p[1],rad+5.5,0,Math.PI*2);ctx.stroke();}
 }
}
/** Only after author attestation AND local source/checksum verification. These are
 * optical evidence markers, not activated fibers or a reconstructed physiology. */
function drawLivedEvidenceMarks(pos,time){
 if(!livedTraces.size)return;
 for(const [id,trace] of livedTraces){
  const i=nodeIndex.get(id);if(i===undefined)continue;
  const [x,y]=pos[i];if(x<-24||x>W+24||y<-24||y>H+24)continue;
  const r=cl(5.8*Math.pow(zoom/ZOOM_MIN,.12),5.8,10);
  const physiological=lifeFields.get(id);
  if(physiological && physiological.attention>.003){
   // This halo is a rule-driven *interpretation* of sealed author evidence.
   glowAt(x,y,cl(14*Math.sqrt(zoom/ZOOM_MIN),13,65),Math.min(.14,physiological.attention*.16),EMERALD.glows.observationCore);
  }
  const pulse=matchMedia('(prefers-reduced-motion: reduce)').matches?0:.5+.5*Math.sin(time*.8+i);
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
  ctx.strokeStyle=trace.reinterpretation?`rgba(${EMERALD.nodes.selected},${.22+.16*pulse})`:`rgba(${EMERALD.nodes.concept},${.12+.09*pulse})`;
  ctx.lineWidth=.7;ctx.stroke();
 }
}
function render(now){const time=(lifePreviewEvent||matchMedia('(prefers-reduced-motion: reduce)').matches)?0:Date.now()/1000;
 if(ready){
  const dt=lastFrameAt?cl(now-lastFrameAt,0,80):16;lastFrameAt=now;
  if(zoom<=1){followSelected=false;pan=easePanHome(pan,dt);}
  reframe();
  if(followSelected&&selected&&zoom>1){
   const focusIndex=nodeIndex.get(selected);
   if(focusIndex!==undefined){
    // Lock to the specimen's resting neighborhood, NOT to its moving pixel.
    // Its quiet independent optical drift remains visible inside the lens.
    const pointed=coords(viewPositions[focusIndex]),aim=[W*.5,H*.46],ease=1-Math.exp(-dt/160);
    pan=[pan[0]+(aim[0]-pointed[0])*ease,pan[1]+(aim[1]-pointed[1])*ease];
   }
  }
  if(sourceView){
   lastFrameScreenNodes=null;
   const pos=viewPositions.map(coords);drawSourceReading();if(selected)positionCard(pos);
  }else{
   const pos=positions(time);drawBackground(time,pos);drawLinks(pos,time);drawRelationFlow(pos,time);drawNodes(pos,time);drawLivedEvidenceMarks(pos,time);if(selected)positionCard(pos);
   lastFrameScreenNodes=pos.map((p,i)=>[nodes[i].id,Number(p[0].toFixed(4)),Number(p[1].toFixed(4))]);
  }
  lastFrameRenderedAt=new Date().toISOString();lastFrameCamera={mode,angle,elevation,zoom,pan:[...pan],selectedId:selected};
  frames++;if(now-lastFpsAt>950){fps=Math.round(frames*1000/(now-lastFpsAt));lastFpsAt=now;frames=0;updateDebug();}
 }
 requestAnimationFrame(render);
}
function chooseMode(next){if(!['Whole','Growth','Movement'].includes(next))return;mode=next;
 for(const b of document.querySelectorAll('#mode button'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));saveMemory();updateDebug();}
function nearest(x,y){if(!ready)return null;const pos=sourceView?viewPositions.map(coords):positions(Date.now()/1000);let min=Infinity,best=null;
 for(let i=0;i<pos.length;i++){if(sourceView&&!sourceView.structure.projectedIds.has(nodes[i].id))continue;const p=pos[i],d=Math.hypot(p[0]-x,p[1]-y);if(d<min){min=d;best=nodes[i];}}
 return min<cl(10*Math.sqrt(zoom/ZOOM_MIN),9,23)?best:null;
}
function locatorSVG(n){const position=viewPositions[nodeIndex.get(n.id)];const x=cl((project(position)[0]-center[0])/5+.5,0,1),y=cl(.5-(project(position)[1]-center[1])/5,0,1);
 return `<svg viewBox="0 0 26 26" aria-hidden="true"><ellipse cx="13" cy="13" rx="10" ry="8" fill="none" stroke="#c4d7ca" stroke-width=".65"/><circle cx="${(3+x*20).toFixed(1)}" cy="${(4+y*18).toFixed(1)}" r="1.9" fill="#387c60"/><circle cx="13" cy="13" r="1" fill="#b4c6ba"/></svg>`;}
function showCard(id){if(!id||!nodeMap.has(id)||(sourceView&&!sourceView.structure.projectedIds.has(id))){selected=null;followSelected=false;$('card').style.display='none';document.body.classList.remove('deep');saveMemory();return;}
 selected=id;const n=nodeMap.get(id),r=(sourceView?sourceView.structure.sourceRecords.get(id):null)||n.record,category=r?.kind||n.kind;
 $('category').textContent=category==='exhibition'?'EXHIBITIONS':category.toUpperCase();
 $('cardTitle').textContent=r?.title||id;
 $('cardRole').textContent=roles[category]?.[0]||'Archive material';
 $('cardLink').href=r?.path?'https://tow-archive.pages.dev'+r.path:'#';
 $('cardLink').onclick=()=>{saveMemory();};
 $('locator').innerHTML=locatorSVG(n);
 const actual=(sourceView?sourceView.structure.projectedEdges:links).filter(l=>l.from===id||l.to===id),rLinks=actual.slice(0,3).map(l=>{
  const linkedId=l.from===id?l.to:l.from;const other=(sourceView?sourceView.structure.sourceRecords.get(linkedId):null)||nodeMap.get(linkedId)?.record;
  return other?.path?`<a href="${esc('https://tow-archive.pages.dev'+other.path)}">${esc(other.title)}</a>`:'';
 }).filter(Boolean);
 $('cardConnected').innerHTML=actual.length?`元数据关联 ${actual.length} · ${rLinks.join(' · ')}`:'尚未建立明确的档案关联';
 for(const a of $('cardConnected').querySelectorAll('a'))a.addEventListener('click',saveMemory);
 $('card').style.display='block';document.body.classList.toggle('deep',zoom>=2);saveMemory();
}
function selectAndFollow(id,{magnify=true}={}){
 if(!id||!nodeMap.has(id)){showCard(null);return;}
 showCard(id);
 if(magnify&&zoom<1.65){
  const projected=sourceView?coords(viewPositions[nodeIndex.get(id)]):positions(Date.now()/1000)[nodeIndex.get(id)];
  setZoom(1.65,[projected[0],projected[1]]);
 }
 followSelected=zoom>1;saveMemory();
}
function positionCard(pos){const i=nodes.findIndex(n=>n.id===selected);if(i<0)return;
 const p=followSelected&&zoom>=8?coords(viewPositions[i]):pos[i],card=$('card'),width=card.offsetWidth||160,height=card.offsetHeight||100;
 const x=cl(p[0]+12,8,W-width-8),y=cl(p[1]+12,108,H-height-155);
 card.style.left=x+'px';card.style.top=y+'px';document.body.classList.toggle('deep',zoom>=2);
}
function pointerHere(e){const rect=canvas.getBoundingClientRect();return [e.clientX-rect.left,e.clientY-rect.top];}
function anchorPoint(){return lastPointer&&lastPointer.every(Number.isFinite)?lastPointer:[W*.5,H*.48];}
function controlAnchor(){
 const index=selected?nodeIndex.get(selected):undefined;
 return index===undefined?[W*.5,H*.48]:coords(viewPositions[index]);
}
function setZoom(value,anchor=anchorPoint()){
 const old=zoom,next=cl(value,ZOOM_MIN,ZOOM_MAX);
 // The inverse projection of this exact pointer is unchanged after zoom.
 if(next!==old)pan=panForCursorZoom(pan,old,next,anchor,[W*.5,H*.48]);
 zoom=next;if(zoom<=1)followSelected=false; // Manual zoom never restarts automatic follow.
 $('zoomLabel').textContent=Math.round(zoom*100)+'%';
 document.body.classList.toggle('deep',zoom>=2);saveMemory();
}
/** Archive date selection is a visual index over the CURRENT frozen graph.
 * No `as-of` topology, retrospective fiber generation or simulated body state.
 */
function renderHistoryMonth(month){
 const group=observationGroups.find(g=>g.key===month);
 if(!group)return;
 historyMonth=month;
 activeHistoryContext=historyOpen?monthObservationContext(month,observationGroups,links):null;
 $('historyHeading').textContent=`${group.year} · ${String(group.month).padStart(2,'0')}月`;
 const years=[...new Set(observationGroups.map(g=>g.year))].sort((a,b)=>a-b);
 const previous=years.filter(year=>year<group.year).at(-1),following=years.find(year=>year>group.year);
 for(const [id,target] of [['historyPrevYear',previous],['historyNextYear',following]]){
  const button=$(id);button.hidden=target===undefined;button.disabled=target===undefined;
  button.onclick=target===undefined?null:()=>{const next=observationGroups.find(g=>g.year===target);if(next)renderHistoryMonth(next.key);};
 }
 $('historyCount').textContent=`${group.entries.length} 条已核实展览记录 · 全部 ${observationLedger.length} 条`;
 const monthBox=$('historyMonths'),entriesBox=$('historyEntries');
 monthBox.replaceChildren();entriesBox.replaceChildren();
 // Months are source-derived and sorted Jan-Dec within the chosen year.
 const yearGroups=observationGroups.filter(g=>g.year===group.year).slice().sort((a,b)=>a.month-b.month);
 const maxCount=Math.max(1,...yearGroups.map(g=>g.entries.length));
 for(const info of yearGroups){
  const b=document.createElement('button');b.type='button';b.className='month';
  b.setAttribute('aria-pressed',String(info.key===historyMonth));
  b.setAttribute('aria-label',`${info.year}年${info.month}月，${info.entries.length}条记录`);
  b.title=`${info.year}.${String(info.month).padStart(2,'0')} · ${info.entries.length} 条`;
  const bar=document.createElement('span');bar.className='month-bar';
  bar.style.height=(4+Math.round(23*Math.sqrt(info.entries.length/maxCount)))+'px';
  const name=document.createElement('span');name.className='month-label';name.textContent=String(info.month).padStart(2,'0');
  b.append(bar,name);b.addEventListener('click',()=>{renderHistoryMonth(info.key);saveMemory();});monthBox.append(b);
 }
 for(const r of group.entries){
  const b=document.createElement('button');b.type='button';b.className='entry';
  b.setAttribute('aria-label',`${r.occurredOn} · ${r.title} · 定位档案粒子`);
  const date=document.createElement('span');date.className='entry-date';date.textContent=r.occurredOn.slice(-5).replace('-','.');
  const title=document.createElement('span');title.className='entry-title';title.textContent=r.title;
  b.append(date,title);
  b.addEventListener('click',()=>{setHistoryOpen(false);selectAndFollow(r.id);});
  entriesBox.append(b);
 }
 entriesBox.scrollTop=0;
 saveMemory();
}
/** Versions are source snapshots, never editable or backdated physiological frames. */
function setHistoryTab(next){
 if(!['visits','versions','frames','acts','life'].includes(next))return;
 if((next==='visits'||next==='acts')&&sourceView)exitSourceReading();
 historyTab=next;
 for(const [tab,button,view] of [['visits','historyVisitsTab','historyVisitView'],['versions','historyVersionsTab','historyVersionView'],['frames','historyFramesTab','historyFrameView'],['acts','historyActsTab','historyActsView'],['life','historyLifeTab','historyLifeView']]){
  $(button).setAttribute('aria-selected',String(tab===next));
  $(view).hidden=tab!==next;
 }
 activeHistoryContext=null;
 if(historyOpen){
  if(next==='visits'){
   const date=selected?nodeMap.get(selected)?.record?.occurredOn:null;
   const selectedMonth=date&&observationGroups.find(g=>g.key===date.slice(0,7))?.key;
   const month=selectedMonth||historyMonth||observationGroups[0]?.key;
   if(month)renderHistoryMonth(month);
  }else if(next==='versions'){ $('historyCount').textContent='来源版本记录 · 无历史形态回放'; renderChronicle(); }
  else if(next==='frames'){ $('historyCount').textContent='当前画面留存 · 非生理形态快照'; renderOpticalFrameHistory(); }
  else if(next==='acts'){ $('historyCount').textContent='作者亲自确认的研究行为 · 不推断'; renderLivedActivities(); }
  else { $('historyCount').textContent='真实事件衍生的规则演算 · 非历史实拍'; renderLifeReadings(); }
 }
 saveMemory();
}
function setHistoryOpen(open){
 historyOpen=Boolean(open);document.body.classList.toggle('history-open',historyOpen);
 $('history').setAttribute('aria-expanded',String(historyOpen));
 if(historyOpen)setHistoryTab(historyTab);
 else activeHistoryContext=null;
 saveMemory();
}
/** Only versions with source file checksums appear here. Checking a checkpoint
 * never reroutes the 174 currently verified nodes or replays synthetic T1/T2.
 */
function renderChronicle(){
 if(!chronicleIndex)return;
 const list=$('historyVersions');list.replaceChildren();
 $('versionCount').textContent=`${chronicleIndex.entries.length} 份来源可追溯的档案版本 · 0 份可倒放的历史生命形态`;
 for(const entry of chronicleIndex.entries.slice().reverse()){
  const b=document.createElement('button');b.type='button';b.className='version-entry';
  b.setAttribute('aria-pressed',String(entry.id===(selectedCheckpointId||chronicleIndex.entries.at(-1).id)));
  const date=document.createElement('span');date.className='version-date';
  date.textContent=entry.capturedAt?entry.capturedAt.slice(0,10):entry.sourceCalendarDate;
  const title=document.createElement('span');title.textContent=entry.label;
  b.append(date,title);b.addEventListener('click',()=>{selectedCheckpointId=entry.id;renderChronicle();});list.append(b);
 }
 const e=chronicleIndex.entries.find(x=>x.id===selectedCheckpointId)||chronicleIndex.entries.at(-1);
 selectedCheckpointId=e.id;
 const box=$('historyVersionDetail');box.replaceChildren();
 const title=document.createElement('h3');title.textContent=e.label;
 const desc=document.createElement('p');desc.textContent=e.seq===0?
  '来源日期只有日级精度；这份基线没有可确认的历史入库时刻。':
  `记录封存于 ${e.capturedAt}。这是源档案版本的封存时刻，并非观展发生或生理激活时刻。`;
 const counts=document.createElement('p');counts.className='version-numbers';
 counts.textContent=`${e.counts.records} 条档案 · ${e.counts.displayed} 条显示 · ${e.counts.verifiedVisibleReferences} 条当前版本元数据关联 · ${e.counts.independentVisibleRecords} 条独立记录`;
 const changes=document.createElement('p');
 if(e.changes)changes.textContent=`与上一版相比：新增 ${e.changes.recordsAdded} · 移除 ${e.changes.recordsRemoved} · 修改 ${e.changes.recordsEdited} 条记录；元数据引用 +${e.changes.referencesAdded} / −${e.changes.referencesRemoved}。`;
 else changes.textContent='初始基线：尚无经过确认的前一个档案版本可供比较。';
 const provenance=document.createElement('p');provenance.className='version-provenance';
 provenance.textContent=`来源：${e.sourceRef} · SHA-256 ${e.entryHash.slice(0,12)}…`;
 const verify=document.createElement('p');verify.className='version-verify';
 verify.textContent=verifiedCheckpointFiles.has(e.id)?'✓ 已核对两份源数据的完整 SHA-256':'正在核对来源文件…';
 box.append(title,desc,counts,changes,provenance,verify);
 const action=document.createElement('button');action.type='button';action.className='version-open-structure';
 action.textContent='在空间中阅读这一版本 ↗';action.disabled=versionReadingBusy;
 action.setAttribute('aria-label','在现有参考坐标上阅读这个来源版本的真实节点和元数据关系，不是历史形态');
 action.addEventListener('click',()=>enterSourceReading(e.id,action));box.append(action);
 if(verifiedCheckpointFiles.has(e.id))return;
 // The displayed digest chain was checked at initialisation. To mark specific
 // source bytes verified, fetch and check them separately, not on trust.
 verifySelectedSources(e,async path=>{
  const response=await fetch('./'+path,{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  return response.text();
 },shaRawText).then(()=>{
  verifiedCheckpointFiles.add(e.id);
  if(selectedCheckpointId===e.id)verify.textContent='✓ 已核对两份源数据的完整 SHA-256';
 }).catch(error=>{
  if(selectedCheckpointId===e.id)verify.textContent='来源文件校验失败：'+error.message;
 });
}
async function loadVerifiedSourceEntry(entry){
 const result=await readVerifiedSourceState(entry,async path=>{
  const response=await fetch('./'+path,{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);return response.text();
 },shaRawText);
 if(result.navigation.mode!=='SIMULATED_SANDBOX')throw Error('Unrecognized source provenance');
 return result.navigation;
}
function exitSourceReading(){
 versionRequest++;sourceView=null;
 $('sourceReadingBadge').hidden=true;
 document.body.classList.remove('source-reading');
 if(selected)showCard(selected);
}
async function enterSourceReading(checkpointId,action){
 if(versionReadingBusy)return;
 const entry=chronicleIndex.entries.find(x=>x.id===checkpointId);if(!entry)return;
 const request=++versionRequest;
 versionReadingBusy=true;action.disabled=true;action.textContent='核对来源中…';
 try{
  const current=await loadVerifiedSourceEntry(entry);
  const previous=entry.seq>0?await loadVerifiedSourceEntry(chronicleIndex.entries[entry.seq-1]):null;
  const structure=sourceStructure(current,nodes.map(n=>n.id),previous);
  validateStructureCounts(structure,entry);
  if(request!==versionRequest)return;
  exitLifePreview();sourceView={entry,structure};followSelected=false;
  activeHistoryContext=null;
  if(selected&&!structure.projectedIds.has(selected))showCard(null);
  else if(selected)showCard(selected);
  $('sourceReadingText').textContent=`SOURCE / ${entry.capturedAt?.slice(0,10)||entry.sourceCalendarDate} · ${structure.drawableCount} 个可定位节点 / ${structure.drawableEdges} 条关系`;
  $('sourceReadingUnplaced').textContent=structure.unplaced.length?`没有 T₀ 坐标：${structure.unplaced.length} 条（${structure.unplaced.slice(0,2).map(x=>x.title).join(' · ')}${structure.unplaced.length>2?'…':''}）· 不显示为粒子`:'使用 T₀ 参考位置 · 不是历史生命形态';
  $('sourceReadingBadge').hidden=false;
  document.body.classList.add('source-reading');
  setHistoryOpen(false);
  // Geometry is unchanged. This is a static graph reading, not past anatomy.
 }catch(error){if(request===versionRequest){
  const message=document.createElement('p');message.className='version-verify';message.textContent='无法打开：'+error.message;
  $('historyVersionDetail').append(message);
 }}finally{
  versionReadingBusy=false;
  if(action.isConnected){action.disabled=false;action.textContent='在空间中阅读这一版本 ↗';}
 }
}
/** A captured optical frame is an observed PNG of the *present* canvas.
 * It cannot be promoted into a biological life event or retroactive body.
 * Exporting from the browser never silently changes the Git repository.
 */
async function exportPresentFrame(){
 const button=$('frameCapture'),message=$('frameCaptureStatus');
 if(sourceView||lifePreviewEvent){message.textContent='请先退出来源结构阅读或规则回放，再记录当下实时画面。';return;}
 if(!ready||!lastFrameRenderedAt||!lastFrameScreenNodes){message.textContent='画面尚未准备好。';return;}
 button.disabled=true;message.textContent='正在核验并导出当前画面…';
 try{
  if(!renderShaCache){
   const res=await fetch('./viewer.mjs',{cache:'no-store'});
   if(!res.ok)throw Error('无法核对 viewer.mjs 的源文件');
   renderShaCache=await shaRawText(await res.text());
  }
  const base=chronicleIndex.entries[0];
  const recordedAt=new Date().toISOString();
  // The screenshot and recorded metadata both refer to the last completed
  // frame. If a tab was asleep, refuse to turn an old canvas into a new event.
  if(Math.abs(Date.parse(recordedAt)-Date.parse(lastFrameRenderedAt))>3000)throw Error('画面尚未实时更新；请重新打开此标签页。');
  const png=canvas.toDataURL('image/png');
  const raw=atob(png.slice('data:image/png;base64,'.length));
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  const pngSha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
  const payload=opticalFramePayload({png,recordedAt,frameRenderedAt:lastFrameRenderedAt,
   camera:lastFrameCamera,cssViewport:[W,H],pixelViewport:[canvas.width,canvas.height],
   selectedId:lastFrameCamera.selectedId,screenNodes:lastFrameScreenNodes,rendererSha256:renderShaCache,archiveSourceEntryHash:base.entryHash,opticalGeometrySha256:base.opticalGeometry.sha256,
   authoredEventCount:livedEvidence.length,lifeLedgerIndexHash:livedIndex.indexHash});
  const frame={...payload,pngSha256};frame.exportHash=await shaRawText(canonicalJSON(frame));
  const blob=new Blob([JSON.stringify(frame,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='murmurgrove-present-frame-'+recordedAt.replace(/[:.]/g,'-')+'.json';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  message.textContent='已导出本次画面证据。要让它出现在历史里，请运行 IMPORT-OPTICAL-FRAME.cmd 手动封存，然后刷新。';
 }catch(err){message.textContent='导出失败：'+err.message;}
 finally{button.disabled=false;}
}
async function renderOpticalFrameHistory(){
 const list=$('historyFrames'),detail=$('historyFrameDetail');list.replaceChildren();detail.replaceChildren();
 const safeFrameEntries=withdrawnIds.size?opticalFrameIndex.entries.filter(e=>e.approvedLifeEvents===0):opticalFrameIndex.entries;
 if(!opticalFrameIndex)return;
 $('frameCount').textContent=`${safeFrameEntries.length} 帧可显示的光学画面 · ${opticalFrameIndex.entries.length-safeFrameEntries.length} 帧因撤回事件而隐藏 · 0 帧已验证的历史生理形态`;
 for(const entry of safeFrameEntries.slice().reverse()){
  const b=document.createElement('button');b.type='button';b.className='version-entry';
  b.setAttribute('aria-pressed',String(entry.id===(chosenOpticalFrame||safeFrameEntries.at(-1)?.id)));
  const date=document.createElement('span');date.className='version-date';date.textContent=entry.recordedAt.slice(0,10);
  const label=document.createElement('span');label.textContent=`${entry.frameMode} · ${entry.recordedAt.slice(11,16)} UTC`;
  b.append(date,label);b.addEventListener('click',()=>{chosenOpticalFrame=entry.id;renderOpticalFrameHistory();});list.append(b);
 }
 const e=safeFrameEntries.find(x=>x.id===chosenOpticalFrame)||safeFrameEntries.at(-1);
 if(!e){const p=document.createElement('p');p.textContent='目前没有保存的画面。点击下方按钮记录当前浏览器实际呈现的一帧；导出后由你明确确认并手动封存。';detail.append(p);return;}
 chosenOpticalFrame=e.id;
 const heading=document.createElement('h3');heading.textContent=e.recordedAt.slice(0,19).replace('T',' ')+' UTC';
 const evidence=document.createElement('p');evidence.className='version-provenance';evidence.textContent='校验文件中…';
 detail.append(heading,evidence);
 const request=++frameLoadRequest;
 try{
  const response=await fetch('./'+e.file,{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);
  const raw=await response.text();if(await shaRawText(raw)!==e.rawSha256)throw Error('原始画面文件 SHA-256 不匹配');
  const frame=JSON.parse(raw);
  await verifyFrameEvidence(frame,shaRawText,async bytes=>{
   const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
  },base64=>Uint8Array.from(atob(base64),c=>c.charCodeAt(0)));
  if(frame.exportHash!==e.exportHash||frame.rendererSha256!==e.rendererSha256||frame.recordedAt!==e.recordedAt||frame.archiveSourceEntryHash!==e.archiveSourceEntryHash)throw Error('封存的元数据和索引不一致');
  if(request!==frameLoadRequest||historyTab!=='frames'||!historyOpen)return;
  evidence.textContent=`✓ 画面与来源校验通过 · ${frame.camera.mode} · ${Math.round(frame.camera.zoom*100)}% · ${frame.pixelViewport.join('×')} px`;
  const image=document.createElement('img');image.className='frame-thumb';image.src=frame.png;image.alt='经过校验的过去某一时刻实际渲染画面';
  image.setAttribute('tabindex','0');image.setAttribute('role','button');image.setAttribute('aria-label','放大查看这张历史画面');
  const show=()=>{$('frameFullImage').src=frame.png;$('frameFullCaption').textContent=`${frame.recordedAt} · ${frame.camera.mode} · 这是当时的光学画面，不是生理历史。`;$('frameFull').showModal();};
  image.addEventListener('click',show);image.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();show();}});
  detail.append(image);
  const explanation=document.createElement('p');explanation.textContent='留存的是当时的像素和视角，不是可倒放的生命事件。渲染器的 SHA-256 与所引用的档案基线一起被记录。';detail.append(explanation);
 }catch(err){if(request===frameLoadRequest)evidence.textContent='校验失败：'+err.message;}
}

/** Phase 3.1. A user-selected current act, never inferred from viewing or clicking.
 * It is only a DRAFT until the author additionally imports it in a local CMD. */
function renderLivedActivities(){
 if(!livedIndex)return;
 $('livedCount').textContent=`${livedEvidence.length} 条仍有效的本人研究行为 · ${withdrawnIds.size} 条已撤回且不参与显示/形态 · 可在 Life states 查看规则演算`;
 const box=$('livedEntries');box.replaceChildren();
 if(!livedEvidence.length){const p=document.createElement('p');p.className='hp-empty';p.textContent='尚无已确认的研究行为。系统不会把浏览、点击或观展日期自动当作生命事件。';box.append(p);}
 for(const x of livedEvidence.slice().reverse()){
  const id=x.event.payload.recordRefs[0],r=nodeMap.get(id)?.record;
  const b=document.createElement('button');b.type='button';b.className='entry lived-entry';
  const date=document.createElement('span');date.className='entry-date';date.textContent=x.event.recordedAt.slice(0,10);
  const label=document.createElement('span');label.className='entry-title';label.textContent=`${LIVED_KINDS[x.event.kind]} · ${r?.title||id}`;
  b.append(date,label);b.title=x.event.payload.note;
  b.addEventListener('click',()=>{setHistoryOpen(false);selectAndFollow(id);});box.append(b);
 }
}
function exportLivedDraft(){
 const msg=$('livedStatus');msg.textContent='';
 try{
  if(!$('livedConfirm').checked)throw Error('请先明确确认：这项研究行为确实由你本人发生。');
  const nonce=[...crypto.getRandomValues(new Uint8Array(16))].map(v=>v.toString(16).padStart(2,'0')).join('');
  const draft=makeLivedDraft({kind:$('livedKind').value,recordId:$('livedRecord').value,note:$('livedNote').value,
   evidenceUrl:$('livedEvidenceUrl').value,recordedAt:new Date().toISOString(),nonce,
   baselineProjectionHash:BASELINE_HASH,archiveSourceEntryHash:chronicleIndex.entries[0].entryHash});
  const blob=new Blob([JSON.stringify(draft,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;
  a.download='murmurgrove-author-attested-act-'+draft.recordedAt.replace(/[-:.]/g,'').replace('T','t').replace('Z','z')+'.json';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  msg.textContent='草稿已下载。运行 IMPORT-LIVED-ACT.cmd 后再刷新网页。仅下载不会改变生命体。';
 }catch(e){msg.textContent='未导出：'+e.message;}
}
async function verifyLoadedLivedEvidence(){
 await verifyLivedIndex(livedIndex,shaRawText);
 const checkpoint=chronicleIndex.entries[0],out=[];
 withdrawnIds=withdrawalSet(withdrawalIndex);
 for(const entry of livedIndex.entries){
  const response=await fetch('./'+entry.file,{cache:'no-store'});
  if(!response.ok)throw Error('Life evidence HTTP '+response.status);
  const raw=await response.text();
  if(await shaRawText(raw)!==entry.rawSha256)throw Error('Life evidence file modified: '+entry.eventId);
  // Suppressed evidence is integrity-checked but never interpreted, cached,
  // rendered or projected into the living body. Raw local files remain private.
  if(withdrawnIds.has(entry.eventId))continue;
  const data=JSON.parse(raw),record=nav.records.find(r=>r.id===entry.recordId);
  validateSealedLivedEvidence(data,{record,checkpoint,seq:entry.seq});
  if(data.event.eventId!==entry.eventId||data.event.kind!==entry.kind||data.event.recordedAt!==entry.recordedAt||data.event.payload.recordRefs[0]!==entry.recordId||entry.archiveSourceEntryHash!==data.source.archiveSourceEntryHash)
   throw Error('Life evidence does not match ledger entry: '+entry.eventId);
  out.push(data);
 }
 withdrawnIds=withdrawalSet(withdrawalIndex);
 livedEvidence=filterWithdrawnEvidence(out,withdrawalIndex);livedTraces=referencedLivedTraces(livedEvidence);
}
/** A reproducible, explicitly labelled MODEL reconstruction, not a witnessed past.
 * Only a verified sealed author event can affect this morphology. */
function computeLifeState(asOf){
 return deriveLifeMorphology({nodes:nodes.map((n,i)=>({id:n.id,position:viewPositions[i]})),links,evidence:livedEvidence,asOf});
}
function activateLifeState(state){
 lifeActiveState=state;lifeFields=lifeRecordMap(state);
}
function exitLifePreview(){
 lifeCheckpointRequest++;lifePreviewEvent=null;lifePreviewAsOf=null;
 activateLifeState(lifeNowState);$('lifeModelBadge').hidden=true;
 if(historyOpen&&historyTab==='life')renderLifeReadings();
}
function previewLifeEvent(eventId){
 const evidence=livedEvidence.find(x=>x.event.eventId===eventId);
 if(!evidence)return;
 lifePreviewEvent=eventId;lifePreviewAsOf=evidence.event.recordedAt;
 activateLifeState(computeLifeState(lifePreviewAsOf));
 $('lifeModelText').textContent=`RULE MODEL / ${lifePreviewAsOf.slice(0,10)} · ${lifeActiveState.authoredEventsUsed} recorded acts`;
 $('lifeModelBadge').hidden=false;
 setHistoryOpen(false);
 selectAndFollow(evidence.event.payload.recordRefs[0],{magnify:false});
}
async function previewSealedLifeState(entry){
 const request=++lifeCheckpointRequest;
 try{
  const response=await fetch('./'+entry.file,{cache:'no-store'});
  if(!response.ok)throw Error('Checkpoint state HTTP '+response.status);
  const raw=await response.text();
  if(await shaRawText(raw)!==entry.rawSha256)throw Error('Sealed state file checksum mismatch');
  const payload=JSON.parse(raw);
  await verifyLifeCapture(payload,shaRawText,{entry,knownEventHeads:new Set(livedIndex.entries.map(e=>e.entryHash))});
  if(request!==lifeCheckpointRequest)return;
  const source=chronicleIndex.entries[0];
  if(payload.archiveSourceEntryHash!==source.entryHash||payload.baselineGeometrySha256!==source.opticalGeometry.sha256)throw Error('Stored rule state has a different source geometry');
  if(lifeCaptureIncludesWithdrawal(entry.sourceEventHead,livedIndex,withdrawalIndex,entry.excludedEventIds))throw Error('This checkpoint contains a withdrawn event and cannot be displayed');
  if(payload.authoredEvents>livedEvidence.length)throw Error('Rule capture implies future unverified source events');
  // Reuse the stored rule geometry itself. Later rule changes cannot rewrite it.
  activateLifeState(payload.state);
  lifePreviewEvent=entry.id;lifePreviewAsOf=payload.capturedAt;
  $('lifeModelText').textContent=`SEALED RULE / ${payload.capturedAt.slice(0,10)} · ${payload.authoredEvents} attested acts`;
  $('lifeModelBadge').hidden=false;
  setHistoryOpen(false);
 }catch(e){if(request===lifeCheckpointRequest)$('lifeRuleInfo').textContent='封存状态校验未通过：'+e.message;}
}
function renderLifeReadings(){
 const box=$('lifeStateEntries');box.replaceChildren();
 if(!lifeNowState)return;
 $('lifeStateCount').textContent=`${livedEvidence.length} 条封存的作者行为 · ${lifeNowState.activeRecords} 个有近期活动的节点 · ${lifeNowState.sedimentaryRecords} 个有解释沉积的节点`;
 const readableStates=lifeStateIndex.entries.filter(e=>!lifeCaptureIncludesWithdrawal(e.sourceEventHead,livedIndex,withdrawalIndex,e.excludedEventIds));
 $('lifeRuleInfo').textContent=`规则 ${LIFE_RULE_VERSION} · 可读规则状态 ${readableStates.length} 份 · 因撤回隐藏 ${lifeStateIndex.entries.length-readableStates.length} 份 · 原始158条关系不变 · 已激活纤维 ${lifeNowState.activatedFibers} · 成熟推进核 ${lifeNowState.matureCores}`;
 if(!livedEvidence.length){
  const empty=document.createElement('p');empty.className='hp-empty';empty.textContent='暂无经过本人确认并封存的生命事件，所以也没有可供回读的事件形态。当前身体仍是安静的 T₀ 基线。';box.append(empty);return;
 }
 for(const checkpoint of [...readableStates].reverse()) {
  const row=document.createElement('button');row.type='button';row.className='entry';
  const date=document.createElement('span');date.className='entry-date';date.textContent=checkpoint.capturedAt.slice(0,10);
  const label=document.createElement('span');label.className='entry-title';label.textContent=`◇ 已封存的规则状态 · ${checkpoint.authoredEvents} 个本人事件`;
  row.append(date,label);row.onclick=()=>previewSealedLifeState(checkpoint);box.append(row);
 }
 const now=document.createElement('button');now.type='button';now.className='entry';now.textContent='◌ 现在 · 返回当前规则演算';
 now.onclick=()=>{exitLifePreview();setHistoryOpen(false);};box.append(now);
 for(const t of eventReconstructionTimes(livedEvidence).reverse()){
  const entry=document.createElement('button');entry.type='button';entry.className='entry';
  const date=document.createElement('span');date.className='entry-date';date.textContent=t.at.slice(0,10);
  const r=nav.records.find(x=>x.id===t.recordId),label=document.createElement('span');label.className='entry-title';
  label.textContent=`${t.kind==='life.encounter'?'Encounter':'Reinterpretation'} · ${r?.title||t.recordId}`;
  entry.append(date,label);entry.onclick=()=>previewLifeEvent(t.eventId);box.append(entry);
 }
}
function updateDebug(){$('status').textContent=`${fps} FPS / ${links.length} source-backed traces`;
 $('debugText').innerHTML=`已核验基线 <strong>181</strong> 条<br>参与显示 <strong>174</strong> 条<br>非隔离元数据引用 <strong>${links.length}</strong> 条<br>孤立档案 <strong>${isolated.size}</strong> 条<br>作者确认研究行为 <strong>${livedEvidence.length}</strong> 条<br>作者确认生命纤维 <strong>0</strong> 条<br>Writing 成熟核心 <strong>0</strong><br>视角 <strong>${mode}</strong><br>画面微动 = 光学表现，不是作者生命事件。`;
}
function resize(){const oldW=W,oldH=H,rect=canvas.getBoundingClientRect();W=Math.max(1,rect.width);H=Math.max(1,rect.height);dpr=Math.min(devicePixelRatio||1,1.5);
 canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
 if(pendingPanNorm){pan=[pendingPanNorm[0]*W,pendingPanNorm[1]*H];pendingPanNorm=null;}
 else if(oldW>1&&oldH>1)pan=[pan[0]*W/oldW,pan[1]*H/oldH];
 if(ready)reframe();}
function initUI(){
 document.querySelectorAll('#mode button').forEach(b=>b.addEventListener('click',()=>chooseMode(b.dataset.mode)));
 $('minus').addEventListener('click',()=>{followSelected=false;setZoom(zoom/1.35,controlAnchor());});
 $('plus').addEventListener('click',()=>{followSelected=false;setZoom(zoom*1.35,controlAnchor());});
 $('closeCard').addEventListener('click',()=>showCard(null));$('locator').addEventListener('click',()=>{followSelected=false;setZoom(.65,[W*.5,H*.48]);});
 $('history').addEventListener('click',()=>setHistoryOpen(!historyOpen));
 $('historyVisitsTab').addEventListener('click',()=>setHistoryTab('visits'));
 $('historyVersionsTab').addEventListener('click',()=>setHistoryTab('versions'));
 $('historyFramesTab').addEventListener('click',()=>setHistoryTab('frames'));
 $('historyActsTab').addEventListener('click',()=>setHistoryTab('acts'));
 $('historyLifeTab').addEventListener('click',()=>setHistoryTab('life'));
 $('lifeModelExit').addEventListener('click',exitLifePreview);
 $('livedExport').addEventListener('click',exportLivedDraft);
 $('frameCapture').addEventListener('click',exportPresentFrame);
 $('frameFullClose').addEventListener('click',()=>$('frameFull').close());
 $('sourceReadingExit').addEventListener('click',exitSourceReading);
  $('historyClose').addEventListener('click',()=>setHistoryOpen(false));
 $('menu').addEventListener('click',()=>document.body.classList.toggle('debug'));
 $('about').addEventListener('click',()=>document.body.classList.toggle('debug'));
 $('recordSelect').addEventListener('change',e=>{selectAndFollow(e.target.value);document.body.classList.remove('debug');});
 let gesture=null;
 canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0||!e.isPrimary)return;
  lastPointer=pointerHere(e);pointerType=e.pointerType;
  gesture={pointerId:e.pointerId,position:[e.clientX,e.clientY],pan:[...pan],angle,elevation,
   zoomAtStart:zoom,shift:e.shiftKey,moved:false};
  canvas.setPointerCapture(e.pointerId);
 });
 canvas.addEventListener('pointermove',e=>{
  lastPointer=pointerHere(e); // Hover alone never changes the camera.
  if(!gesture||e.pointerId!==gesture.pointerId)return;
  const dx=e.clientX-gesture.position[0],dy=e.clientY-gesture.position[1];
  if(!gesture.moved&&Math.hypot(dx,dy)>5){
   gesture.moved=true;
   followSelected=false; // User takes control, no automatic recenter tug-of-war.
   gesture.pan=[...pan];
  }
  if(gesture.moved){
   const next=viewDrag(gesture,[e.clientX,e.clientY],{zoom:gesture.zoomAtStart,shift:gesture.shift});
   if(next.kind==='pan'){pan=next.pan;}else{angle=next.angle;elevation=next.elevation;}
   canvas.style.cursor='grabbing';
  }
 });
 canvas.addEventListener('pointerup',e=>{
  if(!gesture||e.pointerId!==gesture.pointerId)return;
  if(!gesture.moved&&e.detail!==2){const [x,y]=pointerHere(e);const hit=nearest(x,y);selectAndFollow(hit?.id??null);}
  gesture=null;canvas.style.cursor='grab';saveMemory();
 });
 canvas.addEventListener('pointercancel',()=>{gesture=null;canvas.style.cursor='grab';});
 canvas.addEventListener('lostpointercapture',()=>{gesture=null;canvas.style.cursor='grab';});
 canvas.addEventListener('wheel',e=>{e.preventDefault();lastPointer=pointerHere(e);followSelected=false;
  setZoom(zoom*Math.exp(-e.deltaY*.001),lastPointer);},{passive:false});
 canvas.addEventListener('dblclick',e=>{e.preventDefault();lastPointer=pointerHere(e);followSelected=false;
  setZoom(zoom<2?2:zoom*1.5,lastPointer);});
 window.addEventListener('keydown',e=>{if(e.key==='Escape'){setHistoryOpen(false);showCard(null);document.body.classList.remove('debug');}
  if(e.key.toLowerCase()==='r'){angle=.63;elevation=.20;followSelected=false;showCard(null);setZoom(.65,[W*.5,H*.48]);}
 });
 let pinchDist=null;canvas.addEventListener('touchstart',e=>{if(e.touches.length===2)pinchDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);},{passive:true});
 canvas.addEventListener('touchmove',e=>{if(e.touches.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(pinchDist&&d>1){const rect=canvas.getBoundingClientRect();
  const midpoint=[(e.touches[0].clientX+e.touches[1].clientX)/2-rect.left,(e.touches[0].clientY+e.touches[1].clientY)/2-rect.top];
  followSelected=false;setZoom(zoom*d/pinchDist,midpoint);}
  pinchDist=d;gesture=null;}},{passive:true});
 canvas.addEventListener('touchend',e=>{if(e.touches.length<2)pinchDist=null;},{passive:true});
 window.addEventListener('resize',resize);window.addEventListener('pagehide',saveMemory);
 window.addEventListener('pageshow',()=>{if(ready){storedMemory();chooseMode(mode);setZoom(zoom);if(selected)showCard(selected);}});
}
async function init(){
 try{
  [baseline,nav,snapshot,manifest,chronicleIndex,opticalFrameIndex,livedIndex,lifeStateIndex,withdrawalIndex]=await Promise.all([...['known-data-baseline.v1','navigation','T0','manifest'].map(loadJSON),loadChronicle(),loadOpticalFrameIndex(),loadLivedIndex(),loadLifeCheckpointIndex(),loadWithdrawalIndex()]);
  await verifyWithdrawalIndex(withdrawalIndex,shaRawText,{livedIndex});
  await verifyLifeStateIndex(lifeStateIndex,shaRawText);
  await verifyOpticalFrameIndex(opticalFrameIndex,shaRawText);
  await verifyChronicle(chronicleIndex,shaRawText);
  const first=chronicleIndex.entries[0];
  if(first.baselineProjectionHash!==baseline.baselineProjectionHash||first.navigationHash!==nav.navigationHash||first.opticalGeometry?.sha256!=='6d83b426de74ed737e0feb944fcc6266d0033c2a386ff9f19cc9cc32d173a16a')throw Error('Chronicle baseline is inconsistent with pinned T0');
  if(baseline.baselineProjectionHash!==BASELINE_HASH||await sha(Object.fromEntries(Object.entries(baseline).filter(([k])=>k!=='baselineProjectionHash')),{ordered:true})!==BASELINE_HASH)throw Error('Known-data baseline hash invalid');
  const {navigationHash,...navBody}=nav;if(await sha(navBody)!==navigationHash)throw Error('Navigation SHA-256 invalid');
  const {snapshotHash,...snapBody}=snapshot;if(await sha(snapBody)!==snapshotHash||manifest.snapshots.find(s=>s.phase==='T0')?.snapshotHash!==snapshotHash)throw Error('Silent T0 snapshot SHA-256 invalid');
  preprocess();await verifyLoadedLivedEvidence();
  lifeNowState=computeLifeState(new Date().toISOString());activateLifeState(lifeNowState);storedMemory();resize();ready=true;initUI();chooseMode(mode);setZoom(zoom);
  if(selected)showCard(selected);
  const select=$('recordSelect'),livedSelect=$('livedRecord');for(const r of records){const option=document.createElement('option');option.value=r.id;option.textContent=`${r.kind} · ${r.title}`;select.append(option);livedSelect.append(option.cloneNode(true));}
  $('loading').style.display='none';lastFpsAt=performance.now();requestAnimationFrame(render);
  window.__MURMUR_REAL__={baselineHash:BASELINE_HASH,nodes:174,metadataLinks:158,isolatedRecords:20,interiorQuietDisplayPositions:20,zoomMaximum:ZOOM_MAX,
    get camera(){return {angle,elevation,zoom,pan:[...pan],selected,followSelected};},
    approvedLifeEvents:livedEvidence.length,authoredEvidenceTraces:livedTraces.size,activatedWritingFibers:0,matureCores:0,lifeRuleVersion:LIFE_RULE_VERSION,derivedLifeEvents:lifeNowState.authoredEventsUsed,
    get lifeReading(){return {asOf:lifeActiveState?.asOf,eventsUsed:lifeActiveState?.authoredEventsUsed||0,activeRecords:lifeActiveState?.activeRecords||0,sedimentaryRecords:lifeActiveState?.sedimentaryRecords||0,previewIsRuleReconstruction:Boolean(lifePreviewEvent),activatedFibers:0,matureCores:0};},datedExhibitionRecords:observationLedger.length,observationalMonths:observationGroups.length,chronicleVersions:chronicleIndex.entries.length,recordedOpticalFrames:opticalFrameIndex.entries.length,livedActs:livedEvidence.length,withdrawnActs:withdrawnIds.size,sealedDerivedLifeStates:lifeStateIndex.entries.filter(e=>!lifeCaptureIncludesWithdrawal(e.sourceEventHead,livedIndex,withdrawalIndex,e.excludedEventIds)).length,verifiedHistoricalMorphologies:0,
    get sourceReading(){return sourceView?{mode:SOURCE_READING_MODE,id:sourceView.entry.id,drawableNodes:sourceView.structure.drawableCount,drawableEdges:sourceView.structure.drawableEdges,unplaced:sourceView.structure.unplaced.length,geometryWasReused:true}:null;},exhibitionKernelDays:13,opticalMovementRate:MOVEMENT_RATE,opticalBreathingRate:BREATH_RATE,source:'real TOW ARCHIVE baseline; historical physiology unknown',get fps(){return fps;}};
 }catch(e){$('loading').style.display='none';$('loadingError').style.display='block';$('loadingError').textContent='安全停止：'+e.message;console.error(e);}
}
init();
