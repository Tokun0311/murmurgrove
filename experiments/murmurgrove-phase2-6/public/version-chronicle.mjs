/** Phase 2.8 · Source-backed archive version evidence, NOT historical morphology.
 * Each checkpoint records source bytes and differences. In particular,
 * a dated exhibition is not an ingest event, and an edit is not a life event.
 */
export const CHRONICLE_SCHEMA='murmurgrove.archive-chronicle.v1';
export const CHRONICLE_MODE='READ_ONLY_SOURCE_EVIDENCE_NOT_BIOLOGICAL_REWIND';
export function canonicalJSON(value){
 if(Array.isArray(value))return `[${value.map(canonicalJSON).join(',')}]`;
 if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonicalJSON(value[k])}`).join(',')}}`;
 return JSON.stringify(value);
}
export function sourceEdges(nav){
 if(!Array.isArray(nav?.metadataLinks))throw Error('Invalid metadata links');
 return nav.metadataLinks.map(l=>[l.from,l.to,l.sourceField,l.status,l.activated]);
}
/** Source changes only; no inference about biology, meaning, or author activity. */
export function compareArchiveSources(before,after){
 const a=new Map(before.records.map(r=>[r.id,canonicalJSON(r)]));
 const b=new Map(after.records.map(r=>[r.id,canonicalJSON(r)]));
 if(a.size!==before.records.length||b.size!==after.records.length)throw Error('Duplicate record id');
 const added=[...b.keys()].filter(id=>!a.has(id)).sort();
 const removed=[...a.keys()].filter(id=>!b.has(id)).sort();
 const edited=[...a.keys()].filter(id=>b.has(id)&&a.get(id)!==b.get(id)).sort();
 const x=new Set(sourceEdges(before).map(canonicalJSON)),y=new Set(sourceEdges(after).map(canonicalJSON));
 if(x.size!==before.metadataLinks.length||y.size!==after.metadataLinks.length)throw Error('Duplicate metadata edge');
 return {
  recordsAdded:added.length,recordsRemoved:removed.length,recordsEdited:edited.length,
  referencesAdded:[...y].filter(v=>!x.has(v)).length,
  referencesRemoved:[...x].filter(v=>!y.has(v)).length,
  recordIds:{added,removed,edited}
 };
}
const hex=s=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
/** shaCanonical(text) must return sha256 of the supplied UTF-8 string.
 * A digest only detects modification. It is NOT an identity/signature proof.
 */
export async function verifyChronicle(index,shaText){
 if(!index||index.schema!==CHRONICLE_SCHEMA||index.mode!==CHRONICLE_MODE||!Array.isArray(index.entries)||!index.entries.length)throw Error('Invalid chronicle schema');
 const {indexHash,...body}=index;
 if(!hex(indexHash)||await shaText(canonicalJSON(body))!==indexHash)throw Error('Chronicle index digest mismatch');
 const seen=new Set();let previous=null;
 for(let i=0;i<index.entries.length;i++){
  const e=index.entries[i];
  if(e.seq!==i||typeof e.id!=='string'||!/^[a-z0-9][a-z0-9-]{3,70}$/.test(e.id)||seen.has(e.id))throw Error('Invalid checkpoint order or id');
  seen.add(e.id);
  if(e.kind!=='archive-source-checkpoint'||e.previousEntryHash!==previous||typeof e.label!=='string'||!e.label.trim())throw Error('Broken checkpoint chain');
  if(!e.counts||!['records','displayed','quarantined','metadataReferences','verifiedVisibleReferences','independentVisibleRecords','approvedLifeEvents'].every(k=>Number.isInteger(e.counts[k])&&e.counts[k]>=0))throw Error('Invalid source counts');
  if(e.counts.approvedLifeEvents!==0)throw Error('Unverified physiological event in source-only chronicle');
  if(!e.sourceFiles||!e.sourceSha256||!['baseline','navigation'].every(k=>typeof e.sourceFiles[k]==='string'&&hex(e.sourceSha256[k])))throw Error('Missing source files');
  if(!hex(e.baselineProjectionHash)||!hex(e.navigationHash)||!hex(e.auditProjectionHash))throw Error('Missing source provenance');
  if(i===0){
   if(e.id!=='baseline-2026-11-19'||e.capturedAt!==null||e.sourceCalendarDate!=='2026-11-19'||e.timestampPrecision!=='calendar-day-only'||e.changes!==null||e.authorApproval!=='not-asserted')throw Error('Baseline provenance is not historical authoring');
   if(e.sourceFiles.baseline!=='data/known-data-baseline.v1.json'||e.sourceFiles.navigation!=='data/navigation.json'||!e.opticalGeometry||!hex(e.opticalGeometry.sha256))throw Error('Baseline anchor mismatch');
  }else{
   if(!(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(e.capturedAt)&&!Number.isNaN(Date.parse(e.capturedAt))))throw Error('Missing capture timestamp');
   if(e.authorApproval!=='manual-user-attestation'||!e.sourceRef?.trim()||!e.note?.trim()||e.opticalGeometry!==null||!e.changes)throw Error('Unsubstantiated history');
   for(const k of ['baseline','navigation'])if(e.sourceFiles[k]!==`data/chronicle/states/${e.id}/${k}.json`)throw Error('Source path escaped the checkpoint');
  }
  const {entryHash,...fields}=e;
  if(!hex(entryHash)||await shaText(canonicalJSON(fields))!==entryHash)throw Error('Checkpoint digest mismatch: '+e.id);
  previous=entryHash;
 }
 return {valid:true,checkpointCount:index.entries.length,latest:index.entries.at(-1)};
}
/** Fetch only a selected checkpoint's two saved source files. Exact raw bytes are
 * checked against the indexed digests: not merely metadata about them.
 */
export async function readVerifiedSourceState(entry,fetchText,shaText){
 const raw={};
 for(const kind of ['baseline','navigation']){
  const path=entry.sourceFiles[kind];
  if(!/^data\/(?:known-data-baseline\.v1\.json|navigation\.json|chronicle\/states\/[a-z0-9-]+\/(?:baseline|navigation)\.json)$/.test(path))throw Error('Unsafe source path');
  raw[kind]=await fetchText(path);
  if(await shaText(raw[kind])!==entry.sourceSha256[kind])throw Error('Source file modified: '+kind);
 }
 const state={};for(const kind of ['baseline','navigation']){
  try{state[kind]=JSON.parse(raw[kind]);}catch{throw Error('Invalid JSON source: '+kind);}
 }
 if(state.baseline.baselineProjectionHash!==entry.baselineProjectionHash||
    state.navigation.navigationHash!==entry.navigationHash||
    state.navigation.baselineProjectionHash!==entry.baselineProjectionHash)
  throw Error('Selected source projection identifiers disagree with checkpoint');
 return state;
}
export async function verifySelectedSources(entry,fetchText,shaText){
 await readVerifiedSourceState(entry,fetchText,shaText);
 return true;
}
