/**
 * Murmurgrove Phase 1B.1: deterministic emergent cores, buffered critical
 * transitions and observable geometric discontinuities. Headless Node 22+.
 *
 * Important boundaries:
 *  - derived transitions are NOT archive or life events;
 *  - no invented links or third-party content;
 *  - 'regional novelty' is topological/spatial, NOT semantic interdisciplinarity;
 *  - no Math.random, no stateful timers, no background running process;
 *  - all times refer to recordedAt, never backdated occurredOn.
 */
import { replay, fingerprint, isInstant } from './protocol.mjs';
import { simulateMorphology, seedPoint, metrics as baseMetrics } from './dynamics.mjs';

export const EMERGENCE_VERSION='murmurgrove.emergence.1b.1';
export const EMERGENCE_DEFAULTS=Object.freeze({
  digestionDays: 13,
  batchWindowHours: 24,
  batchEnergyCapacity: 2.6,
  thresholdCharge: 1.5,
  refractoryDays: 45,
  inertiaGrowth: .33,
  fieldSigma: .56,
  minCorePotential: .27,
  maxCoreCandidates: 8,
  coreExclusionDistance: .42,
  isolationGap: .40,
  precision: 9,
});
const DAY_MS=86_400_000;
const q=x=>Number(x.toFixed(EMERGENCE_DEFAULTS.precision));
const vec=(a,b)=>a.map((v,i)=>v+b[i]);
const diff=(a,b)=>a.map((v,i)=>v-b[i]);
const scale=(a,s)=>a.map(v=>v*s);
const norm=a=>Math.hypot(...a);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>norm(a)>1e-10?scale(a,1/norm(a)):[0,0,0];
const distance=(a,b)=>norm(diff(a,b));
const avg=(values)=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
const clamp=(x,l,h)=>Math.max(l,Math.min(h,x));
const instant=ms=>new Date(Math.round(ms)).toISOString().replace('.000Z','Z');
const rounded=v=>Array.isArray(v)?v.map(q):q(v);
function insist(condition,msg){if(!condition)throw new Error(msg);}
function stableConfig(config={}){
  const keys=Object.keys(EMERGENCE_DEFAULTS);
  insist(config && typeof config==='object'&&!Array.isArray(config),'config must be an object');
  for(const key of Object.keys(config))insist(keys.includes(key),`unknown config key: ${key}`);
  const c={...EMERGENCE_DEFAULTS,...config};
  for(const [key,val] of Object.entries(c)) insist(Number.isFinite(val)&&val>0,`invalid positive config ${key}`);
  insist(c.precision===EMERGENCE_DEFAULTS.precision,'precision is fixed for cross-runtime hashes');
  insist(Number.isSafeInteger(c.maxCoreCandidates)&&c.maxCoreCandidates<=32,'maxCoreCandidates must be integer <=32');
  return c;
}
/** Canonical source order; Phase 1A rejects conflicting duplicates/backdating. */
function eventSource(events){
  replay(events);
  return [...new Map(events.map(e=>[e.eventId,e])).values()].sort((a,b)=>a.seq-b.seq);
}
/**
 * Work is supplied only by explicitly named relation references in life events.
 * Novelty = connection geometry / new activation (a proxy, not a discipline tag).
 * Encounters nourish the body but are intentionally weak critical triggers.
 */
export function collectWork(events,{asOf,config={}}={}) {
  const cfg=stableConfig(config);
  const ordered=eventSource(events);
  const when=asOf??(ordered.at(-1)?.recordedAt||'2026-01-01T00:00:00Z');
  insist(isInstant(when),'asOf must be ISO UTC instant');
  const tLimit=Date.parse(when);
  const records=new Map(), links=new Map(), activatedLinks=new Set(), work=[];
  for(const e of ordered){
    if(Date.parse(e.recordedAt)>tLimit)break;
    if(e.kind==='archive.record.upsert'){records.set(e.payload.record.id,e.payload.record);continue;}
    if(e.kind==='archive.record.remove'){
      const id=e.payload.recordId;
      records.delete(id);
      for(const [linkId,l] of [...links])if(l.from===id||l.to===id){links.delete(linkId);activatedLinks.delete(linkId);}
      continue;
    }
    if(e.kind==='archive.link.assert'){
      const l=e.payload.link,old=links.get(l.id);
      if(old && (old.from!==l.from||old.to!==l.to))activatedLinks.delete(l.id);
      links.set(l.id,l);continue;
    }
    if(e.kind==='archive.link.retract'){
      links.delete(e.payload.linkId);activatedLinks.delete(e.payload.linkId);continue;
    }
    const ids=e.payload.linkRefs||[];
    // Life events without explicit relations cannot manufacture a strain bridge.
    let total=0,eligible=false,accumulatedDirection=[0,0,0];
    for(const linkId of ids){
      const l=links.get(linkId);
      insist(l,`unknown activated link ${linkId}`);
      const a=records.get(l.from),b=records.get(l.to);
      const spatialProxy=distance(seedPoint(l.from),seedPoint(l.to));
      const writing=a.kind==='writing'||b.kind==='writing';
      const newActivation=!activatedLinks.has(l.id);
      const proxy=clamp(.72+spatialProxy*.18,.72,1.08);
      const novel=newActivation?1.15:.56;
      const material=writing?1.18:.69;
      const life=e.kind==='life.writing'?1.25:e.kind==='life.reinterpretation'?1.33:
        e.kind==='life.connection'?1.05:.15;
      const weight=l.strength*proxy*novel*material*life;
      total+=weight;
      accumulatedDirection=vec(accumulatedDirection,scale(unit(diff(seedPoint(l.to),seedPoint(l.from))),weight));
      if(e.kind!=='life.encounter')eligible=true;
      activatedLinks.add(l.id);
    }
    if(ids.length>0)work.push({at:e.recordedAt,eventId:e.eventId,kind:e.kind,
      work:q(total),criticalWork:eligible?q(total):0,eligible,
      linkRefs:[...ids].sort(),direction:rounded(unit(accumulatedDirection))});
  }
  return {asOf:when,work};
}
/**
 * A bounded metabolic cohort aggregates rapid imports. This does NOT change
 * event timestamps or the underlying facts; only the physiological reaction.
 */
export function buildDigestionEpisodes(work,{config={}}={}) {
  const cfg=stableConfig(config);
  const sorted=[...work].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)||a.eventId.localeCompare(b.eventId));
  const episodes=[],window=cfg.batchWindowHours*3_600_000;
  for(const w of sorted){
    const t=Date.parse(w.at);
    insist(Number.isFinite(t) && Number.isFinite(w.work)&&w.work>=0,'invalid work entry');
    const last=episodes.at(-1);
    if(!last || t-last.startMs>window){
      episodes.push({startMs:t,endMs:t,sourceEvents:[],rawWork:0,criticalWork:0,eligible:false,writingEventCount:0,directionSum:[0,0,0]});
    }
    const ep=episodes.at(-1);
    ep.endMs=t;ep.rawWork+=w.work;ep.criticalWork+=(w.criticalWork??(w.eligible?w.work:0));
    ep.sourceEvents.push(w.eventId);
    ep.directionSum=vec(ep.directionSum,scale(w.direction||[0,0,0],w.criticalWork??(w.eligible?w.work:0)));
    ep.eligible ||= Boolean(w.eligible);
    if(w.kind==='life.writing'||w.kind==='life.reinterpretation')ep.writingEventCount++;
  }
  return episodes.map((ep,i)=>({id:`episode:${String(i+1).padStart(5,'0')}:${instant(ep.startMs)}`,
    startedAt:instant(ep.startMs),endedAt:instant(ep.endMs),
    startMs:ep.startMs,count:ep.sourceEvents.length,sourceEventIds:ep.sourceEvents.sort(),
    eligible:ep.eligible,writingEventCount:ep.writingEventCount,
    direction:rounded(unit(ep.directionSum)),rawWork:q(ep.rawWork),
    criticalWork:q(ep.criticalWork),
    // Only writing, connection and reinterpretation can change global direction.
    capacity:q(cfg.batchEnergyCapacity*(-Math.expm1(-ep.criticalWork/cfg.batchEnergyCapacity))),
    // Backfilled encounters still pass through a bounded nutrition buffer.
    nourishmentCapacity:q(cfg.batchEnergyCapacity*(-Math.expm1(-ep.rawWork/cfg.batchEnergyCapacity)))}));
}
function absorbed(ep,t,cfg){
  if(t<=ep.startMs)return 0;
  return ep.capacity*(-Math.expm1(-(t-ep.startMs)/(cfg.digestionDays*DAY_MS)));
}
/**
 * Exact analytic digestion + monotone crossing root. Never time-step through
 * maintenance events, making transition timestamps independent of inert edits.
 * A jump consumes its whole cohort set once, so one 500-event bulk import
 * cannot trigger repeated delayed replays of the same energy.
 */
export function resolveThresholds(episodes,{asOf,config={}}={}){
  const cfg=stableConfig(config);
  insist(isInstant(asOf),'threshold resolution requires asOf');
  const endMs=Date.parse(asOf),refractoryMs=cfg.refractoryDays*DAY_MS;
  const list=[...episodes].filter(e=>e.startMs<=endMs).sort((a,b)=>a.startMs-b.startMs||a.id.localeCompare(b.id));
  const transitions=[];
  let first=0,lastJump=-Infinity,sedimentWork=0;
  const chargeAt=(t,i,j)=>{
    let sum=0;
    for(let k=i;k<=j;k++)sum+=absorbed(list[k],t,cfg);
    return sum;
  };
  for(let j=0;j<list.length;j++){
    const windowStart=list[j].startMs;
    const windowEnd=Math.min(endMs,list[j+1]?.startMs??endMs);
    let begin=Math.max(windowStart,lastJump+refractoryMs);
    if(begin>windowEnd||first>j)continue;
    if(!list.slice(first,j+1).some(e=>e.eligible))continue;
    // Existing transformed material increases inertia (a declared hypothesis).
    const dynamicThreshold=cfg.thresholdCharge*(1+cfg.inertiaGrowth*Math.log1p(sedimentWork));
    if(chargeAt(windowEnd,first,j)<dynamicThreshold-1e-12)continue;
    let target;
    if(chargeAt(begin,first,j)>=dynamicThreshold)target=begin;
    else {
      let low=begin,high=windowEnd;
      for(let n=0;n<52;n++){
        const mid=(low+high)/2;
        if(chargeAt(mid,first,j)>=dynamicThreshold)high=mid;
        else low=mid;
      }
      target=Math.ceil(high); // reproducible at millisecond precision
    }
    const chosen=list.slice(first,j+1);
    const sourceAxis=unit(chosen.reduce((acc,e)=>vec(acc,scale(e.direction,e.capacity)),[0,0,0]));
    transitions.push({id:`threshold:${String(transitions.length+1).padStart(4,'0')}`,
      triggeredAt:instant(target),
      consumedEpisodeIds:chosen.map(x=>x.id),
      causedByLifeEventIds:chosen.flatMap(x=>x.sourceEventIds).sort(),
      accumulatedCharge:q(chargeAt(target,first,j)),
      inertiaThreshold:q(dynamicThreshold),priorSedimentWork:q(sedimentWork),
      sourceDirection:rounded(sourceAxis),
      refractoryUntil:instant(target+refractoryMs),
      // Purely derived morphological transition, NOT a new LifeEvent.
      eventKind:'derived.threshold-transformation'});
    lastJump=target;sedimentWork+=chosen.reduce((sum,e)=>sum+e.rawWork,0);first=j+1;
  }
  const unconsumed=list.slice(first);
  return {transitions,
    digestion:{episodeCount:list.length,pendingWork:q(unconsumed.reduce((s,e)=>s+e.capacity-absorbed(e,endMs,cfg),0)),
      absorbedWork:q(unconsumed.reduce((s,e)=>s+absorbed(e,endMs,cfg),0)),
      rawInputWork:q(list.reduce((s,e)=>s+e.rawWork,0)),
      pendingNutrition:q(list.reduce((s,e)=>s+(e.nourishmentCapacity-e.nourishmentCapacity*(-Math.expm1(-(endMs-e.startMs)/(cfg.digestionDays*DAY_MS)))),0)),
      refractoryUntil:transitions.at(-1)?.refractoryUntil??null}};
}
function densityAt(p,nodes,fibers,sigma){
  const denom=2*sigma*sigma;
  const decay=(d)=>Math.exp(-d*d/denom);
  const conceptDensity=nodes.filter(n=>n.kind==='concept'&&n.activity>1e-8)
    .reduce((s,n)=>s+n.activity*decay(distance(p,n.position)),0);
  const fibDensity=fibers.filter(f=>f.tension>1e-8).reduce((s,f)=>{
    const mid=f.points[2],weight=f.writing?1.5:.34;
    return s+f.tension*weight*decay(distance(p,mid));
  },0);
  return {conceptDensity,fiberDensity:fibDensity,potential:Math.sqrt(conceptDensity*fibDensity)};
}
/** Promotion cores are local maxima of joint concept-activity and fiber strain. */
export function findPropulsionCores(morphology,{config={}}={}){
  const cfg=stableConfig(config),nodes=morphology.nodes;
  const kindById=new Map(nodes.map(n=>[n.id,n.kind]));
  const fibers=morphology.fibers.map(f=>({...f,writing:kindById.get(f.from)==='writing'||kindById.get(f.to)==='writing'}));
  const candidates=[...nodes.filter(n=>n.kind==='concept'&&n.activity>1e-8).map(n=>n.position),
    ...fibers.filter(f=>f.tension>1e-8).map(f=>f.points[2])];
  const potential=candidates.map((p,i)=>({position:p,order:i,...densityAt(p,nodes,fibers,cfg.fieldSigma)}))
    .filter(c=>c.potential>=cfg.minCorePotential)
    .sort((a,b)=>b.potential-a.potential||a.order-b.order);
  const cores=[];
  for(const item of potential){
    if(cores.length>=cfg.maxCoreCandidates)break;
    if(cores.some(c=>distance(c.position,item.position)<cfg.coreExclusionDistance))continue;
    let acc=[0,0,0],total=0;
    for(const f of fibers){
      const w=f.tension*(f.writing?1.5:.34)*Math.exp(-Math.pow(distance(item.position,f.points[2])/cfg.fieldSigma,2));
      if(w<=1e-9)continue;
      const tangent=diff(f.points[3],f.points[1]);
      acc=vec(acc,scale(tangent,w));total+=w;
    }
    const direction=norm(acc)>1e-9?scale(acc,1/norm(acc)):[0,0,0];
    cores.push({id:`core:${cores.length+1}`,position:rounded(item.position),
      potential:q(item.potential),conceptDensity:q(item.conceptDensity),
      fiberTensionDensity:q(item.fiberDensity),direction:rounded(direction)});
  }
  return cores;
}
/** Components only use fibers that were activated by real LifeEvents. */
export function disconnectedRegions(morphology,{config={}}={}){
  const cfg=stableConfig(config),activeNodes=morphology.nodes.filter(n=>n.activeEver);
  if(activeNodes.length===0)return {mainRegionId:null,regions:[],islands:[]};
  const byId=new Map(activeNodes.map(n=>[n.id,n]));
  const parent=new Map(activeNodes.map(n=>[n.id,n.id]));
  function root(id){let p=parent.get(id);while(parent.get(p)!==p)p=parent.get(p);return p;}
  function union(a,b){const x=root(a),y=root(b);if(x!==y)parent.set(x<y?y:x,x<y?x:y);}
  for(const f of morphology.fibers)if(f.activeEver&&byId.has(f.from)&&byId.has(f.to))union(f.from,f.to);
  const map=new Map();
  for(const n of activeNodes){const id=root(n.id);if(!map.has(id))map.set(id,[]);map.get(id).push(n);}
  const regions=[...map].map(([id,members])=>{
    const mass=members.reduce((s,n)=>s+n.activity*(n.kind==='concept'?1.3:1),0);
    const center=scale(members.reduce((a,n)=>vec(a,scale(n.position,n.activity+.001)),[0,0,0]),
      1/members.reduce((s,n)=>s+n.activity+.001,0));
    return {id:`region:${id}`,memberIds:members.map(n=>n.id).sort(),mass:q(mass),center:rounded(center),
      memberCount:members.length};
  }).sort((a,b)=>b.mass-a.mass||a.id.localeCompare(b.id));
  const main=regions[0];
  const mainMembers=main.memberIds.map(id=>byId.get(id));
  const bodyRadius=Math.max(.2,...mainMembers.map(n=>distance(n.position,main.center)));
  const islands=regions.slice(1).map(region=>{
    const seed=seedPoint(`exterior:${region.id}`),length=Math.max(1e-9,norm(seed));
    const outward=scale(seed,1/length);
    const originalDistance=distance(region.center,main.center);
    const regionRadius=Math.max(0,...region.memberIds.map(id=>distance(byId.get(id).position,region.center)));
    const desired=Math.max(originalDistance,bodyRadius+regionRadius+cfg.isolationGap+.15);
    // This is a derived display-space separation, not a fictional archive link.
    const center=vec(main.center,scale(outward,desired));
    return {regionId:region.id,memberIds:region.memberIds,displayCenter:rounded(center),
      negativeSpaceGap:q(desired-bodyRadius-regionRadius),hasInventedLink:false};
  });
  return {mainRegionId:main.id,regions,islands};
}
/** Audit observables, never used to forcibly restore visual symmetry. */
export function geometryAudit(morphology,regions,cores,{config={}}={}){
  const cfg=stableConfig(config),nodes=morphology.nodes.filter(n=>n.activeEver);
  const total=nodes.reduce((s,n)=>s+n.activity,0);
  const weightedCenter=total>1e-8?scale(nodes.reduce((a,n)=>vec(a,scale(n.position,n.activity)),[0,0,0]),1/total):[0,0,0];
  const centroid=rounded(weightedCenter);
  const activeNodes=nodes.filter(n=>n.activity>1e-8);
  const conceptNodes=activeNodes.filter(n=>n.kind==='concept');
  const kindById=new Map(morphology.nodes.map(n=>[n.id,n.kind]));
  const fibers=morphology.fibers.map(f=>({...f,writing:kindById.get(f.from)==='writing'||kindById.get(f.to)==='writing'}));
  const samples=[...conceptNodes.map(n=>n.position),...fibers.filter(f=>f.tension>0).map(f=>f.points[2])];
  const values=samples.map(p=>densityAt(p,morphology.nodes,fibers,cfg.fieldSigma).potential);
  const mean=avg(values),variance=avg(values.map(v=>(v-mean)**2));
  const drift=cores.reduce((a,c)=>vec(a,scale(c.direction,c.potential)),[0,0,0]);
  return {activityCentroid:centroid,densityVariance:q(variance),localDensityMean:q(mean),
    maxLocalDensity:q(Math.max(0,...values)),coreCount:cores.length,
    regionCount:regions.regions.length,isolatedRegionCount:regions.islands.length,
    totalActivity:q(total),globalDirection:rounded(norm(drift)>1e-9?scale(drift,1/norm(drift)):[0,0,0])};
}
/**
 * A genuine, inspectable deformation of EXISTING material after threshold
 * transitions. It never adds a node, link, or invented archive relationship.
 * Original (including fossil control points) remains unchanged in Phase 1B;
 * these are the reconfigured coordinates of the same existing skeleton.
 * A transition layer is irreversible in the derived event-sourced history.
 */
export function applyReconfigurations(morphology,transitions,regions=null){
  const active=morphology.nodes.filter(n=>n.activeEver);
  const mass=active.reduce((sum,n)=>sum+n.activity+.001,0);
  const center=mass>0?scale(active.reduce((v,n)=>vec(v,scale(n.position,n.activity+.001)),[0,0,0]),1/mass):[0,0,0];
  let orientation=[0,0,0];
  const turns=[];
  for(const tr of transitions){
    const axis=unit(tr.sourceDirection||[0,0,0]);
    if(norm(axis)<1e-8)continue;
    const from=orientation;
    const to=unit(vec(scale(orientation,.3),scale(axis,.7)));
    const angle=norm(from)<1e-8?0:
      Math.acos(clamp(from.reduce((s,v,i)=>s+v*to[i],0),-1,1))*180/Math.PI;
    orientation=to;
    turns.push({triggeredAt:tr.triggeredAt,sourceTransition:tr.id,from:rounded(from),
      to:rounded(to),angleDegrees:q(angle),sourceEventIds:tr.causedByLifeEventIds});
  }
  // The displacement is small but nonzero, and acts through local shear,
  // not a visually prescribed target silhouette. Lignified tissue resists it.
  const shearAt=(position,lignification)=>{
    let displacement=[0,0,0];
    for(const t of turns){
      const axis=t.to;
      const relative=diff(position,center);
      const softness=1/(1+24*Math.pow(lignification||0,4));
      displacement=vec(displacement,scale(cross(axis,relative),.18*softness));
    }
    return displacement;
  };
  const islandShift=new Map();
  for(const island of regions?.islands||[]){
    const region=regions.regions.find(r=>r.id===island.regionId);
    if(!region)continue;
    for(const id of island.memberIds)islandShift.set(id,diff(island.displayCenter,region.center));
  }
  const nodes=morphology.nodes.map(n=>{
    const d=vec(shearAt(n.position,n.lignification),islandShift.get(n.id)||[0,0,0]);
    return {id:n.id,position:rounded(vec(n.position,d)),displacement:rounded(d)};
  });
  const fibers=morphology.fibers.map(f=>({id:f.id,
    points:f.points.map(point=>rounded(vec(vec(point,shearAt(point,f.lignification)),
      islandShift.get(f.from)||[0,0,0]))),
    fossilLayerCount:f.fossilLayers.length}));
  return {orientation:rounded(orientation),turns,nodes,fibers,
    changedGeometry:nodes.some(n=>norm(n.displacement)>1e-8)};
}

/** Complete headless projection: current body + emergent diagnostics. */
export function simulateEmergence(events,{asOf,config={}}={}){
  const cfg=stableConfig(config),ordered=eventSource(events);
  const when=asOf??(ordered.at(-1)?.recordedAt||'2026-01-01T00:00:00Z');
  insist(isInstant(when),'asOf must be UTC ISO instant');
  const morphology=simulateMorphology(ordered,{asOf:when});
  const work=collectWork(ordered,{asOf:when,config:cfg}).work;
  const episodes=buildDigestionEpisodes(work,{config:cfg});
  const thresholds=resolveThresholds(episodes,{asOf:when,config:cfg});
  const cores=findPropulsionCores(morphology,{config:cfg});
  const regions=disconnectedRegions(morphology,{config:cfg});
  const audit=geometryAudit(morphology,regions,cores,{config:cfg});
  const reconfiguration=applyReconfigurations(morphology,thresholds.transitions,regions);
  const result={modelVersion:EMERGENCE_VERSION,asOf:when,baseMorphologyHash:morphology.morphologyHash,
    baseMetrics:baseMetrics(morphology),cores,regions,
    episodes:episodes.map(({startMs,...ep})=>({...ep,
      absorbedAtObservation:q(absorbed({startMs,...ep},Date.parse(when),cfg)),
      pendingAtObservation:q(ep.capacity-absorbed({startMs,...ep},Date.parse(when),cfg))})),
    thresholds,reconfiguration,geometryAudit:audit};
  return {...result,emergenceHash:fingerprint(result)};
}
