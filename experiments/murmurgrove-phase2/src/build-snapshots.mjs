/** Phase 2.0: generate three actual Phase 1B.4 morphology outputs from one simulated event timeline.
 * Read-only source, memory-only events. The only output is an explicit sandbox directory.
 */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,join} from 'node:path';
import {validateFrozenBaseline} from '../../murmurgrove-phase1b/src/known-data-baseline.mjs';
import {memoryBootstrap,SANDBOX_EPOCH,stableLatentIslandLayout} from '../../murmurgrove-phase1b/src/phase1b3-sandbox.mjs';
import {simulateMorphology} from '../../murmurgrove-phase1b/src/dynamics.mjs';
import {simulateLayeredEmergence,archivalPhysiology} from '../../murmurgrove-phase1b/src/physiology-1b4.mjs';
import {replay} from '../../murmurgrove-phase1b/src/protocol.mjs';
const HERE=dirname(fileURLToPath(import.meta.url));
const DEFAULT_BASELINE=resolve(HERE,'../../murmurgrove-phase1b/baseline/known-data-baseline.v1.json');
const DAY=86400000, sha=x=>createHash('sha256').update(x).digest('hex');
const at=x=>new Date(x).toISOString().replace('.000Z','Z');
const assert=(x,m)=>{if(!x)throw Error(m);};
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
const digest=value=>sha(JSON.stringify(canonical(value)));
export const SNAPSHOT_SCHEMA='murmurgrove.render-snapshot.2.0.v1';
export const MODE='SIMULATED_SANDBOX';
export function buildThreeSnapshots(baseline){
 validateFrozenBaseline(baseline);
 const original=digest(baseline), events=memoryBootstrap(baseline);
 let seq=events.length;
 const add=(kind,when,payload)=>{
  assert(Date.parse(when)>=Date.parse(events.at(-1).recordedAt),'Simulation event order invalid');
  events.push({schema:'murmurgrove.event.v1',seq:++seq,eventId:`evt:phase2_sim_${String(seq).padStart(4,'0')}`,
   kind,recordedAt:when,...(kind.startsWith('life.')?{effectiveAt:when}:{}),payload});
 };
 const records=baseline.records.filter(r=>r.materialStatus==='dormant-unactivated');
 const eligible=new Map(records.map(r=>[r.id,r]));
 const ref=new Map();for(const l of baseline.metadataLinks.filter(l=>l.evidenceStatus==='metadata-reference-only')){
  if(l.from.startsWith('exhibition:')&&!ref.has(l.from))ref.set(l.from,l);
 }
 const selected=records.filter(r=>r.kind==='exhibition'&&r.occurredOn?.startsWith('2026-03')&&ref.has(r.id))
  .sort((a,b)=>a.occurredOn.localeCompare(b.occurredOn)||a.id.localeCompare(b.id));
 assert(selected.length===12,`Expected exactly 12 March encounters, got ${selected.length}`);
 const island=stableLatentIslandLayout(baseline);
 const islandMap=new Map(island.positions.map(p=>[p.id,p.position]));
 const first=Date.parse(selected[0].occurredOn+'T00:00:00Z');
 const encounterStart=Date.parse(SANDBOX_EPOCH)+3*DAY;
 const encounterTimes=selected.map(r=>at(encounterStart+Date.parse(r.occurredOn+'T00:00:00Z')-first));
 // One continuous event stream: T0 before the first activation, T1 13 days after the final encounter,
 // T2 13 days after an authored-only-in-simulation Writing added after T1.
 const t0=at(Date.parse(SANDBOX_EPOCH)+DAY);
 const t1=at(Date.parse(encounterTimes.at(-1))+13*DAY);
 const writingEventTime=at(Date.parse(t1)+2*DAY+3600000);
 const t2=at(Date.parse(writingEventTime)+13*DAY);
 const scenes=[];
 function capture(label,when){
  const morphology=simulateMorphology(events,{asOf:when});
  const physiology=simulateLayeredEmergence(events,{asOf:when});
  const ages=archivalPhysiology(baseline,morphology,{referenceDate:'2026-11-19'});
  const byAge=new Map(ages.map(a=>[a.id,a]));
  const nodes=morphology.nodes.filter(n=>eligible.has(n.id)||n.id==='writing:simulated-draft-not-real').map(n=>({
   id:n.id,kind:n.kind,position:n.position,activity:n.activity,lignification:n.lignification,
   activeEver:n.activeEver,archivalAgeDays:byAge.get(n.id)?.archival.ageDays??null,
   quarantined:false,displayPosition:!n.activeEver&&islandMap.has(n.id)?islandMap.get(n.id):n.position,
  }));
  // Quarantined records never enter physical rendering or kinetic geometry.
  const fibers=morphology.fibers.map(f=>({id:f.id,from:f.from,to:f.to,points:f.points,
   tension:f.tension,activity:f.activity,lignification:f.lignification,
   fossilLayers:f.fossilLayers.map(l=>({points:l.points,capturedAt:l.capturedAt})),activeEver:f.activeEver}));
  const branches=morphology.branches.map(b=>({id:b.id,points:b.points,sedimentOf:b.sedimentOf}));
  const pulseChambers=physiology.transientPulseChambers.map(p=>({position:p.position,
   amplitude:p.pulseAmplitude,source:'PHASE1B4_TRANSIENT'}));
  const propulsionCores=physiology.sustainedPropulsionCores.map(c=>({position:c.position,
   potential:c.potential,qualifiedShare:c.qualifiedFiberShare,source:'PHASE1B4_SUSTAINED'}));
  const body={schema:SNAPSHOT_SCHEMA,mode:MODE,phase:label,asOf:when,
   provenance:{baselineProjectionHash:baseline.baselineProjectionHash,
    auditProjectionHash:baseline.provenance.auditProjectionHash,
    morphologyHash:morphology.morphologyHash,physiologyHash:physiology.physiologyHash,
    simulationTimeline:'ONE_COUNTERFACTUAL_EVENT_STREAM_NOT_AUTHOR_HISTORY',
    engine:'Phase1B.4',archivalAgeReference:'2026-11-19',
    noRealLifeEventsImported:true},
   nodes,fibers,branches,pulseChambers,propulsionCores,
   thresholds:{transitionCount:physiology.originalThresholdTransitions},
   counts:{ordinaryRecords:174,quarantinedRecords:7,metadataEvidenceOnly:158,
    simulatedLifeEvents:morphology.lifeCount}};
  return Object.freeze({...body,snapshotHash:digest(body)});
 }
 scenes.push(capture('T0',t0));
 // Simulated link assertions must precede the earliest encounter.
 for(let i=0;i<selected.length;i++){
  const r=selected[i],l=ref.get(r.id);
  assert(eligible.has(l.to),'Cannot link quarantined material');
  add('archive.link.assert',at(Date.parse(SANDBOX_EPOCH)+2*DAY),{link:{id:`link:phase2_enc_${i+1}`,from:r.id,to:l.to,strength:1.6,basis:'explicit'}});
 }
 for(let i=0;i<selected.length;i++){
  const r=selected[i],l=ref.get(r.id);
  add('life.encounter',encounterTimes[i],{recordRefs:[r.id,l.to],linkRefs:[`link:phase2_enc_${i+1}`],
   note:'SIMULATED_SANDBOX: no author assertion'});
 }
 scenes.push(capture('T1',t1));
 const concepts=['concept:institutional-studies','concept:curatorial-practices','concept:performance'];
 for(const c of concepts)assert(eligible.has(c),'Missing pinned real concept '+c);
 const writingId='writing:simulated-draft-not-real';
 const writingPrep=at(Date.parse(t1)+2*DAY);
 add('archive.record.upsert',writingPrep,{reason:'ingest',record:{id:writingId,kind:'writing',title:'SIMULATED ONLY',
  occurredOn:null,occurredOnBasis:'unknown',visibility:'private'}});
 for(let i=0;i<concepts.length;i++)add('archive.link.assert',writingPrep,{link:{id:`link:phase2_write_${i+1}`,
  from:writingId,to:concepts[i],strength:1.5,basis:'explicit'}});
 add('life.writing',writingEventTime,{recordRefs:[writingId,...concepts],
  linkRefs:concepts.map((_,i)=>`link:phase2_write_${i+1}`),note:'SIMULATED_SANDBOX: no author approval'});
 scenes.push(capture('T2',t2));
 replay(events);
 assert(digest(baseline)===original,'Source baseline mutated');
 assert(scenes[0].fibers.length===0 && scenes[0].propulsionCores.length===0,'T0 not silent');
 assert(scenes[1].propulsionCores.length===0,'T1 accidentally matured a core');
 const manifest={schema:'murmurgrove.render-manifest.2.0.v1',mode:MODE,
  baselineProjectionHash:baseline.baselineProjectionHash,
  auditProjectionHash:baseline.provenance.auditProjectionHash,
  timeline:'ONE_SIMULATED_CONTINUOUS_HISTORY',
  inputSourceHash:original,simulatedEventStreamHash:digest(events),
  snapshots:scenes.map(s=>({phase:s.phase,asOf:s.asOf,snapshotHash:s.snapshotHash,
   physiologyHash:s.provenance.physiologyHash,morphologyHash:s.provenance.morphologyHash,
   counts:{nodes:s.nodes.length,fibers:s.fibers.length,pulses:s.pulseChambers.length,cores:s.propulsionCores.length}}))};
 return {scenes,manifest:Object.freeze({...manifest,manifestHash:digest(manifest)})};
}
export function emitSnapshots({baselinePath=DEFAULT_BASELINE,outputDir=resolve(HERE,'../public/data')}={}){
 const safeRoot=resolve(HERE,'../public/data');
 assert(resolve(outputDir)===safeRoot,'Snapshot writer restricted to Phase 2.0 public/data sandbox');
 const baseline=JSON.parse(readFileSync(baselinePath,'utf8'));
 const {scenes,manifest}=buildThreeSnapshots(baseline);
 mkdirSync(outputDir,{recursive:true});
 for(const scene of scenes)writeFileSync(join(outputDir,`${scene.phase}.json`),JSON.stringify(scene,null,2)+'\n');
 writeFileSync(join(outputDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 return manifest;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 console.log(JSON.stringify(emitSnapshots(),null,2));
}
