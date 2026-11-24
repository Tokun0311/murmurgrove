/** Phase 3.2 · Verifiable event-derived morphology.
 * NO events are generated here. Inputs MUST be source-verified sealed author
 * attested records and the currently pinned 158 archive metadata edges.
 * These are declared interpretive optical rules, not measured biology or a
 * witnessed historical body. An archived record does not equal an act.
 * In particular, an encounter or reinterpretation NEVER activates a link or
 * writing fiber and NEVER creates a propulsion core.
 */
export const LIFE_RULE_VERSION='murmurgrove.attested-life-projection.v1';
export const LIFE_PARAMS=Object.freeze({
 encounterWeight:.34, encounterHalfLifeDays:21,
 reinterpretationWeight:.52, reinterpretationHalfLifeDays:60,
 sedimentPerReinterpretation:.12, sedimentLimit:.60,
 neighborResonanceFraction:.09, neighborResonanceLimit:.23,
 maxPositionShift:.025
});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const DAY=86400000;
function assert(ok,msg){if(!ok)throw new Error(msg);}
function angleFor(id){let h=2166136261;for(let i=0;i<id.length;i++){h^=id.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0)/4294967296*Math.PI*2;}
function halfLife(age,days){return Math.pow(.5,age/days);}
function clean(v){return Math.round(v*1e9)/1e9;}
function validTime(t){return typeof t==='string'&&Number.isFinite(Date.parse(t))&&t.endsWith('Z');}
/** Pure and deterministic for a given asOf. Never derives evidence from labels,
 * visits, clicks, OCR, animation frame time, or today's unverified edits. */
export function deriveLifeMorphology({nodes,links,evidence,asOf}){
 assert(Array.isArray(nodes)&&Array.isArray(links)&&Array.isArray(evidence),'Invalid morphology input');
 assert(validTime(asOf),'An explicit UTC asOf is mandatory');
 const when=Date.parse(asOf),idx=new Map();
 for(const n of nodes){
  assert(n&&typeof n.id==='string'&&Array.isArray(n.position)&&n.position.length===3&&n.position.every(Number.isFinite),'Invalid positioned record');
  assert(!idx.has(n.id),'Duplicate node in morphology input');idx.set(n.id,idx.size);
 }
 const adj=new Map([...idx.keys()].map(id=>[id,new Set()]));const edgeKeys=new Set();
 for(const e of links){
  assert(adj.has(e.from)&&adj.has(e.to)&&e.from!==e.to,'Non-baseline morphology edge');
  const key=[e.from,e.to].sort().join('|');assert(!edgeKeys.has(key),'Duplicate morphology edge');edgeKeys.add(key);
  adj.get(e.from).add(e.to);adj.get(e.to).add(e.from);
 }
 const raw=new Map([...idx.keys()].map(id=>[id,{id,attention:0,sediment:0,encounters:0,reinterpretations:0,lastEventAt:null}]));
 let used=0,previousSequence=0;const eventIds=new Set();
 for(const x of evidence){
  const e=x?.event;
  assert(e?.schema==='murmurgrove.event.v1'&&Number.isSafeInteger(e.seq)&&e.seq>previousSequence,'Only ordered sealed events may be projected');
  previousSequence=e.seq;
  assert(typeof e.eventId==='string'&&!eventIds.has(e.eventId),'Duplicate authored event');eventIds.add(e.eventId);
  assert(x?.schema==='murmurgrove.lived-evidence.v1'&&x.source?.attestation==='I_CONFIRM_THIS_RESEARCH_ACTION_OCCURRED','Unattested activity cannot enter morphology');
  assert(['life.encounter','life.reinterpretation'].includes(e.kind)&&Array.isArray(e.payload?.recordRefs)&&e.payload.recordRefs.length===1&&Array.isArray(e.payload.linkRefs)&&e.payload.linkRefs.length===0,'Unsupported activation or implicit semantic edge');
  assert(validTime(e.recordedAt)&&e.recordedAt===e.effectiveAt,'Event chronology is not trustworthy');
  const id=e.payload.recordRefs[0];assert(raw.has(id),'Event refers to a missing or quarantined source node');
  const created=Date.parse(e.recordedAt);if(created>when)continue;
  used++;const state=raw.get(id),age=(when-created)/DAY;
  if(e.kind==='life.encounter'){
   state.attention+=LIFE_PARAMS.encounterWeight*halfLife(age,LIFE_PARAMS.encounterHalfLifeDays);
   state.encounters++;
  }else{
   state.attention+=LIFE_PARAMS.reinterpretationWeight*halfLife(age,LIFE_PARAMS.reinterpretationHalfLifeDays);
   state.sediment+=LIFE_PARAMS.sedimentPerReinterpretation;
   state.reinterpretations++;
  }
  state.lastEventAt=e.recordedAt;
 }
 const records=nodes.map(n=>{
  const v=raw.get(n.id);const neighbors=adj.get(n.id);
  let resonance=0;
  for(const id of neighbors)resonance+=clamp(raw.get(id).attention,0,1)*LIFE_PARAMS.neighborResonanceFraction;
  resonance=clamp(resonance,0,LIFE_PARAMS.neighborResonanceLimit);
  const attention=clamp(v.attention,0,1),sediment=clamp(v.sediment,0,LIFE_PARAMS.sedimentLimit);
  // Endpoint anchors are unchanged. The offset is a small visual interpretation
  // of author-attested activity, not a new or reconstructed source coordinate.
  let dx=0,dy=0;
  for(const id of neighbors){const target=nodes[idx.get(id)].position;dx+=target[0]-n.position[0];dy+=target[1]-n.position[1];}
  const length=Math.hypot(dx,dy);
  const theta=angleFor(n.id);
  if(length>1e-9){dx/=length;dy/=length;}else{dx=Math.cos(theta);dy=Math.sin(theta);}
  const dist=Math.min(LIFE_PARAMS.maxPositionShift,(attention*.017+sediment*.008+resonance*.004));
  const offset=[clean(dx*dist),clean(dy*dist),clean(Math.sin(theta)*dist*.23)];
  return {id:n.id,attention:clean(attention),resonance:clean(resonance),sediment:clean(sediment),
   encounters:v.encounters,reinterpretations:v.reinterpretations,lastEventAt:v.lastEventAt,
   offset,activeWritingFiber:false,matureCore:false};
 });
 const active=records.filter(r=>r.attention>1e-7).length,sedimentary=records.filter(r=>r.sediment>0).length;
 return {schema:LIFE_RULE_VERSION,asOf,ruleParameters:LIFE_PARAMS,sourceNodeCount:nodes.length,sourceLinkCount:edgeKeys.size,
  authoredEventsUsed:used,activatedFibers:0,matureCores:0,
  activeRecords:active,sedimentaryRecords:sedimentary,records};
}
/** Return *model-reconstructed* projections at attested event instants. These
 * must NOT be called preserved historical organism states. */
export function eventReconstructionTimes(evidence){
 assert(Array.isArray(evidence),'Missing evidence');
 return evidence.map(x=>({eventId:x.event.eventId,recordId:x.event.payload.recordRefs[0],kind:x.event.kind,at:x.event.recordedAt}));
}
export function lifeRecordMap(state){return new Map(state.records.map(r=>[r.id,r]));}
export function applyLifeOffset(position,record){
 if(!record)return position;
 return position.map((v,i)=>v+record.offset[i]);
}
