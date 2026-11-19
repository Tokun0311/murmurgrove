/**
 * Murmurgrove Phase 1B — deterministic numerical morphology prototype.
 * Node.js 22+, no external dependencies, no WebGL and no stochastic sampling.
 *
 * State and computed fibers are *latent mechanical geometry*, not a node-link
 * visual design. All active fibers must derive from explicitly asserted links
 * subsequently cited by an approved life event.
 */
import { createHash } from 'node:crypto';
import { fingerprint, isInstant, replay, validateEvent } from './protocol.mjs';

export const MODEL_VERSION = 'murmurgrove.dynamics.1b.0';
const YEAR_MS = 365.2425 * 86400000;
const DEFAULTS = Object.freeze({
  halfLifeYears: 2.1,      // demonstrator parameters, not empirically fitted
  fossilRatePerYear: 0.59,
  restDistance: 0.31,
  relaxSteps: 32,
  springStep: 0.11,
  anchorStep: 0.035,
  fieldStrength: 0.19,
  pulseDecayHalfLifeYears: 2.2,
  reactivationThreshold: 0.85,
  precision: 10,
});
const LIFE_AMPLITUDE = Object.freeze({
  'life.encounter': 0.56,
  'life.writing': 1.15,
  'life.connection': 0.96,
  'life.reinterpretation': 1.26,
});
const TYPE_MASS = Object.freeze({concept:1.6,writing:0.85,exhibition:1.0,person:0.8,institution:2.1});

function ensure(ok,message) { if (!ok) throw new Error(message); }
function r(n) { return Number(n.toFixed(DEFAULTS.precision)); }
function v(x,y,z) { return [x,y,z]; }
const add=(a,b)=>v(a[0]+b[0],a[1]+b[1],a[2]+b[2]);
const sub=(a,b)=>v(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const mul=(a,s)=>v(a[0]*s,a[1]*s,a[2]*s);
const len=a=>Math.hypot(...a);
const norm=a=>mul(a,1/Math.max(1e-9,len(a)));
const cross=(a,b)=>v(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]);
const blend=(a,b,t)=>add(mul(a,1-t),mul(b,t));
const roundV=a=>a.map(r);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

/** A SHA-256 seed is a *coordinate origin*, not an inferred research relation. */
export function seedPoint(stableId) {
  ensure(typeof stableId==='string' && stableId.length>0, 'stable id required');
  const hash=createHash('sha256').update(`murmurgrove:seed:v1:${stableId}`).digest();
  const u=[0,8,16].map(i=>hash.readBigUInt64BE(i));
  const limit=Number((1n<<53n)-1n);
  return u.map(w=>r((Number(w>>11n)/limit)*2-1));
}
function seededUnit(id) {
  const p=seedPoint(id);
  const n=norm(p);
  return len(n)<1e-8?[1,0,0]:n;
}
function makeNode(record) {
  const seed=seedPoint(record.id);
  return {id:record.id,kind:record.kind,seed,position:[...seed],activity:0,
    lignification:0,sedimentLayers:0,scarFactor:0,lastActiveAt:null,
    lastActivationId:null,activeEver:false,sedimentAnchors:[]};
}
function centerline(a,b,t) {return add(a,mul(sub(b,a),t));}
function initialControlPoints(a,b,key) {
  const axis=seededUnit(`axis:${key}`);
  let normal=cross(sub(b,a),axis);
  if(len(normal)<1e-6) normal=cross(sub(b,a),[0,0,1]);
  normal=norm(normal);
  const width=0.04+0.038*len(sub(b,a));
  return [a,add(centerline(a,b,.25),mul(normal,width)),
      add(centerline(a,b,.5),mul(normal,width*1.4)),
      add(centerline(a,b,.75),mul(normal,width)),b].map(roundV);
}
function makeFiber(link,state) {
  const a=state.nodes.get(link.from).position,b=state.nodes.get(link.to).position;
  return {id:link.id,from:link.from,to:link.to,points:initialControlPoints(a,b,link.id),
    tension:0,activity:0,lignification:0,sedimentLayers:0,scarFactor:0,
    lastActiveAt:null,activeEver:false,activatedBy:[],fossilLayers:[]};
}
/** Vector curvature field. Concepts are force-field sources, never a displayable dot. */
export function directionField(position,state,{excludeId=null}={}) {
  let result=[0,0,0];
  for (const node of state.nodes.values()) {
    if(node.kind!=='concept' || node.id===excludeId || node.activity<=1e-8) continue;
    const d=sub(position,node.position), dist=len(d);
    const swirl=cross(seededUnit(`axis:${node.id}`),d);
    const attenuation=1/Math.pow(0.2+dist*dist,1.5);
    const amplitude=node.activity * DEFAULTS.fieldStrength * attenuation;
    result=add(result,add(mul(norm(swirl),amplitude*.65),mul(norm(d),-amplitude*.35)));
  }
  return roundV(mul(result,Math.min(1.0,1/Math.max(1,len(result)))));
}
function advance(state,time) {
  const dt=Date.parse(time)-Date.parse(state.asOf);
  ensure(dt>=0, 'Cannot run biological clock backward');
  const years=dt/YEAR_MS;
  if(!years){state.asOf=time;return;}
  const lambda=Math.LN2/DEFAULTS.halfLifeYears;
  const decay=Math.exp(-lambda*years);
  for(const o of [...state.nodes.values(),...state.fibers.values()]) {
    if(!o.activeEver) continue; // archival presence is not a manufactured life event
    const oldActivity=o.activity;
    o.activity=oldActivity*decay;
    // Integrate dL/dt = k(1-A(t))(1-L) analytically. This is a semigroup:
    // inserting a maintenance event at any intermediate instant cannot change
    // the morphological result at the same asOf.
    const quietIntegral=Math.max(0,years-oldActivity*(-Math.expm1(-lambda*years))/lambda);
    o.lignification=Math.min(.99999,1-(1-o.lignification)*Math.exp(-DEFAULTS.fossilRatePerYear*quietIntegral));
    if('tension' in o) o.tension=o.tension*decay;
  }
  state.asOf=time;
}
function activate(o,now,eventId,gain) {
  if(o.activeEver && o.lignification>=DEFAULTS.reactivationThreshold) {
    o.sedimentLayers++;
    o.scarFactor=r(o.scarFactor+.35);
    if('points' in o) o.fossilLayers.push({capturedAt:now,triggeredBy:eventId,points:structuredClone(o.points)});
    else o.sedimentAnchors.push({capturedAt:now,triggeredBy:eventId,position:[...o.position]});
    // Existing fossil layer stays: no reset of L or positions.
  }
  o.activity=r(clamp(o.activity+gain,0,1));
  o.activeEver=true;
  o.lastActiveAt=now;
  o.lastActivationId=eventId;
}
function branchFromFossil(state,eventId,link,source) {
  const id=`branch:${eventId.slice(4)}:${link.id.slice(5)}`;
  if(state.branches.has(id)) return;
  const joint=source.points[2];
  const newNeighbor=link.from===source.from || link.from===source.to ? link.to : link.from;
  const end=state.nodes.get(newNeighbor)?.position;
  if(!end) return;
  const oldDir=norm(sub(source.points[3],source.points[1]));
  const newDir=norm(sub(end,joint));
  const dot=clamp(oldDir.reduce((s,x,i)=>s+x*newDir[i],0),-1,1);
  const angle=r(Math.acos(dot)*180/Math.PI);
  const fan=seededUnit(`branch:${id}`);
  const mid=add(blend(joint,end,.55),mul(cross(oldDir,fan),.11));
  state.branches.set(id,{id,fromFiber:source.id,causedBy:eventId,toRecord:newNeighbor,
    bornAt:state.asOf,angleDegrees:angle,points:[roundV(joint),roundV(mid),roundV(end)],
    // A fossil fork can remain even as the parent becomes dormant again.
    sedimentOf:source.lignification});
}
function applyLife(state,event,links) {
  const energy=LIFE_AMPLITUDE[event.kind];
  ensure(energy!==undefined,`Unsupported life event ${event.kind}`);
  const ids=new Set(event.payload.recordRefs);
  const referenced=[];
  for(const ref of event.payload.linkRefs||[]) {
    const link=links.get(ref);
    ensure(link,`Life event references unknown link ${ref}`);
    referenced.push(link);ids.add(link.from);ids.add(link.to);
  }
  const previous=new Map();
  for(const id of ids) {
    const node=state.nodes.get(id);
    ensure(node,`Life event references unknown record ${id}`);
    previous.set(id,{lignification:node.lignification,activeEver:node.activeEver});
  }
  const parentFossils=[...state.fibers.values()]
    .filter(f=>f.activeEver&&f.lignification>=DEFAULTS.reactivationThreshold)
    .sort((a,b)=>a.id.localeCompare(b.id));
  for(const id of [...ids].sort()) activate(state.nodes.get(id),event.recordedAt,event.eventId,energy*.72);
  for(const link of referenced.sort((a,b)=>a.id.localeCompare(b.id))) {
    let f=state.fibers.get(link.id);
    if(!f){f=makeFiber(link,state);state.fibers.set(link.id,f);}
    const oldL=f.lignification, oldActivated=f.activeEver;
    activate(f,event.recordedAt,event.eventId,energy*.8);
    f.tension=r(clamp(f.tension+energy*link.strength,0,3.0));
    if(!f.activatedBy.includes(event.eventId)) f.activatedBy.push(event.eventId);
    // Only a new explicitly asserted link may grow the new branch.
    if(!oldActivated) {
      const oldSource=parentFossils.find(parent=>
        (parent.from===link.from||parent.to===link.from||
         parent.from===link.to||parent.to===link.to) && parent.id!==link.id);
      if(oldSource) {
        oldSource.sedimentLayers++;
        oldSource.scarFactor=r(oldSource.scarFactor+.35);
        oldSource.fossilLayers.push({capturedAt:state.asOf,triggeredBy:event.eventId,points:structuredClone(oldSource.points)});
        branchFromFossil(state,event.eventId,link,oldSource);
      }
    } else if(oldL>=DEFAULTS.reactivationThreshold) {
      // Old fiber gains a new layer while preserving its path and direction.
      f.scarFactor=r(f.scarFactor+.05);
    }
  }
  state.lifeCount++;
  state.lastLifeEvent=event.eventId;
  relax(state);
}
function relax(state) {
  const nodes=[...state.nodes.values()].sort((a,b)=>a.id.localeCompare(b.id));
  const fibers=[...state.fibers.values()].filter(f=>f.activeEver&&f.tension>1e-7)
     .sort((a,b)=>a.id.localeCompare(b.id));
  for(let pass=0;pass<DEFAULTS.relaxSteps;pass++) {
    const forces=new Map(nodes.map(n=>[n.id,[0,0,0]]));
    for(const f of fibers) {
      const a=state.nodes.get(f.from), b=state.nodes.get(f.to);
      const delta=sub(b.position,a.position), dist=len(delta);
      if(dist<1e-9) continue;
      const drive=Math.max(0,dist-DEFAULTS.restDistance)*f.tension/(1+f.tension);
      const pull=mul(delta,drive/dist);
      forces.set(a.id,add(forces.get(a.id),pull));
      forces.set(b.id,sub(forces.get(b.id),pull));
    }
    const oldPositions=new Map(nodes.map(n=>[n.id,n.position]));
    for(const n of nodes) {
      const invMass=1/TYPE_MASS[n.kind];
      const stiffness=1+24*Math.pow(n.lignification,4); // finite, never infinity
      const spring=mul(forces.get(n.id),DEFAULTS.springStep*invMass/stiffness);
      const bias=mul(sub(n.seed,n.position),DEFAULTS.anchorStep/stiffness);
      const field=mul(directionField(n.position,state,{excludeId:n.id}),.009/stiffness);
      const next=add(n.position,add(spring,add(bias,field)));
      n.position=roundV(next);
    }
    for(const f of fibers) {
      const a=state.nodes.get(f.from).position, b=state.nodes.get(f.to).position;
      const pts=f.points;
      const softness=.22/(1+25*Math.pow(f.lignification,4));
      const output=[a];
      for(let i=1;i<4;i++) {
        const local=pts[i],t=i/4;
        const center=centerline(a,b,t);
        const field=directionField(local,state);
        // Preserve existing bends (memory). Field generates nonstraight paths.
        const remembered=mul(sub(local,centerline(pts[0],pts[4],t)),.72);
        const desired=add(center,add(remembered,mul(field,.20*(.5+f.tension))));
        output.push(roundV(blend(local,desired,softness)));
      }
      output.push(b);
      f.points=output;
    }
  }
}
function rawState(asOf) {
  return {modelVersion:MODEL_VERSION,asOf,nodes:new Map(),fibers:new Map(),branches:new Map(),
    lifeCount:0,lastLifeEvent:null};
}
/** Deterministically dedupe and preflight using the actual Phase 1A protocol. */
function canonicalEvents(events) {
  ensure(Array.isArray(events),'events must be an array');
  replay(events); // rejects corrupted sequence, invalid targets, backdating, etc.
  const dedup=new Map();
  for(const e of events) {
    validateEvent(e);
    if(!dedup.has(e.eventId))dedup.set(e.eventId,e);
  }
  return [...dedup.values()].sort((a,b)=>a.seq-b.seq);
}
function ensureDate(asOf) {ensure(isInstant(asOf),'asOf must be UTC ISO instant');}
function serialize(state) {
  const numericCanonicalize=o=>Array.isArray(o)?o.map(numericCanonicalize)
    :o&&typeof o==='object'?Object.fromEntries(Object.entries(o).map(([k,v])=>[k,numericCanonicalize(v)]))
    :typeof o==='number'?r(o):o;
  const nodes=[...state.nodes.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(numericCanonicalize);
  const fibers=[...state.fibers.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(numericCanonicalize);
  const branches=[...state.branches.values()].sort((a,b)=>a.id.localeCompare(b.id)).map(numericCanonicalize);
  const p={modelVersion:state.modelVersion,asOf:state.asOf,
    nodes, fibers,branches,lifeCount:state.lifeCount,lastLifeEvent:state.lastLifeEvent};
  return {...p,morphologyHash:fingerprint(p)};
}
/**
 * Events are applied at their real recordedAt, never at occurredOn.
 * `asOf` is an observation instant and can be after the last event.
 * Maintenance preserves morphology except that removing an invalid record/link
 * removes its current derived material; it does not forge a life event or scar.
 * The original historical morphology remains queryable with an earlier asOf.
 */
export function simulateMorphology(events,{asOf}={}) {
  const ordered=canonicalEvents(events);
  const time=asOf??(ordered.length?ordered.at(-1).recordedAt:'2026-01-01T00:00:00Z');
  ensureDate(time);
  const state=rawState(ordered.length && Date.parse(ordered[0].recordedAt)<Date.parse(time)
    ? ordered[0].recordedAt : time);
  const links=new Map();
  for(const event of ordered) {
    if(Date.parse(event.recordedAt)>Date.parse(time)) break;
    advance(state,event.recordedAt);
    const p=event.payload;
    switch(event.kind) {
      case 'archive.record.upsert': {
        if(!state.nodes.has(p.record.id))state.nodes.set(p.record.id,makeNode(p.record));
        // correction or title edit does not reset material or life activity
        break;
      }
      case 'archive.record.remove': {
        state.nodes.delete(p.recordId);
        for(const [id,link] of [...links]) {
          if(link.from===p.recordId||link.to===p.recordId) {
            links.delete(id);state.fibers.delete(id);
          }
        }
        for(const [id,b] of [...state.branches]) {
          if(!state.fibers.has(b.fromFiber)||b.toRecord===p.recordId)state.branches.delete(id);
        }
        break;
      }
      case 'archive.link.assert': {
        const old=links.get(p.link.id);
        if(old && (old.from!==p.link.from||old.to!==p.link.to)) {
          // A rewritten edge is NOT the same asserted relationship. Its
          // old physical tension must not leak into the new endpoints.
          state.fibers.delete(p.link.id);
          for(const [id,b] of [...state.branches])if(b.fromFiber===p.link.id)state.branches.delete(id);
        }
        links.set(p.link.id,p.link);
        break;
      }
      case 'archive.link.retract': {
        links.delete(p.linkId);state.fibers.delete(p.linkId);
        for(const [id,b] of [...state.branches])if(b.fromFiber===p.linkId)state.branches.delete(id);
        break;
      }
      default:applyLife(state,event,links);
    }
  }
  advance(state,time);
  return serialize(state);
}
/** Local reversible, clock-tied microcycle. Not a life event and not persisted. */
export function microSignal(morphology,objectId,instant) {
  ensureDate(instant);
  const obj=[...morphology.nodes,...morphology.fibers].find(x=>x.id===objectId);
  ensure(obj,`Unknown morphology member ${objectId}`);
  const offset=seedPoint(`pulse:${objectId}`);
  const time=Date.parse(instant)/1000;
  const freq=.08+Math.abs(offset[1])*.06;
  const value=Math.sin(2*Math.PI*(time*freq+offset[0]*23));
  return r((.012+.25*obj.activity)*(.5+.5*value));
}
/** Quantitative observables, no geometric rendering. */
export function metrics(morphology) {
  const nodes=morphology.nodes;
  const fibers=morphology.fibers;
  const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
  const bend=f=>{const mid=centerline(f.points[0],f.points[4],.5);return len(sub(f.points[2],mid));};
  return {nodeCount:nodes.length,activeFiberCount:fibers.length,branchCount:morphology.branches.length,
    meanActivity:r(avg([...nodes,...fibers].map(x=>x.activity))),
    meanLignification:r(avg([...nodes,...fibers].map(x=>x.lignification))),
    meanBend:r(avg(fibers.map(bend))),
    totalTension:r(fibers.reduce((s,f)=>s+f.tension,0)),
    lifeEventCount:morphology.lifeCount};
}
