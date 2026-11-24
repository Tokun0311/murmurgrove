/** Phase 3.3: append-only, hash-verifiable captures of RULE-DERIVED life states.
 * These are not observed bodies or author-validated causal scientific models.
 * Hashes are integrity checks, not digital signatures or erasure guarantees.
 */
import {canonicalJSON} from './version-chronicle.mjs';
import {LIFE_RULE_VERSION} from './life-morphology.mjs';
export const LIFE_CAPTURE_SCHEMA='murmurgrove.derived-life-capture.v1';
export const LIFE_CAPTURE_INDEX='murmurgrove.derived-life-index.v1';
export const LIFE_CAPTURE_CLAIM='DETERMINISTIC_RULE_DERIVATION_NOT_OBSERVED_HISTORY';
const isHash=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const check=(v,msg)=>{if(!v)throw Error(msg);};
export async function verifyLifeStateIndex(index,sha){
 check(index?.schema===LIFE_CAPTURE_INDEX&&Array.isArray(index.entries)&&isHash(index.indexHash),'Invalid life checkpoint index');
 check(await sha(canonicalJSON({schema:index.schema,entries:index.entries}))===index.indexHash,'Life checkpoint index digest mismatch');
 let prev=null;const heads=new Set();
 for(let i=0;i<index.entries.length;i++){
  const x=index.entries[i];
  check(x.seq===i+1&&x.kind==='rule-derived-at-seal'&&isHash(x.sourceEventHead)&&!heads.has(x.sourceEventHead),'Invalid life checkpoint order or duplicate source');
  heads.add(x.sourceEventHead);
  check(x.id===`life-${x.sourceEventHead.slice(0,20)}${x.excludedEventIds?.length?'-'+x.withdrawalIndexHash.slice(0,12):''}`&&x.file===`data/life-states/states/${x.id}.json`,'Unsafe life checkpoint path');
  check(isHash(x.rawSha256)&&isHash(x.payloadHash)&&isHash(x.entryHash)&&x.previousEntryHash===prev,'Broken life checkpoint hash chain');
  check(Number.isInteger(x.authoredEvents)&&x.authoredEvents>=1&&isHash(x.engineSha256)&&isHash(x.archiveSourceEntryHash),'Missing checkpoint provenance');
  check(!Number.isNaN(Date.parse(x.capturedAt))&&x.capturedAt?.endsWith('Z'),'Missing checkpoint timestamp');
  if(x.excludedEventIds!==undefined){
   check(isHash(x.withdrawalIndexHash)&&Array.isArray(x.excludedEventIds)&&x.excludedEventIds.length>0&&new Set(x.excludedEventIds).size===x.excludedEventIds.length&&x.excludedEventIds.every(id=>/^evt:[a-z0-9_-]+$/.test(id)),'Invalid withdrawal provenance in rule index');
  }else check(x.withdrawalIndexHash===undefined,'Incomplete withdrawal provenance');
  const {entryHash,...body}=x;check(await sha(canonicalJSON(body))===entryHash,'Life checkpoint entry hash mismatch');prev=x.entryHash;
 }
 return {valid:true,count:index.entries.length};
}
export async function verifyLifeCapture(capture,sha,{entry,knownEventHeads}={}){
 check(capture?.schema===LIFE_CAPTURE_SCHEMA&&capture.claim===LIFE_CAPTURE_CLAIM,'Unsupported life capture claim');
 check(capture.state?.schema===LIFE_RULE_VERSION&&capture.state.asOf===capture.capturedAt,'Invalid derived model state');
 check(capture.state.sourceNodeCount===174&&capture.state.sourceLinkCount===158&&capture.state.activatedFibers===0&&capture.state.matureCores===0,'Unexpected activated fibers or topology');
 check(Array.isArray(capture.state.records)&&capture.state.records.length===174,'Missing model records');
 check(capture.state.records.every(r=>typeof r.id==='string'&&Array.isArray(r.offset)&&r.offset.length===3&&r.offset.every(v=>Number.isFinite(v)&&Math.abs(v)<=.025000001)),'Unsafe model spatial output');
 check(isHash(capture.sourceEventHead)&&isHash(capture.engineSha256)&&isHash(capture.archiveSourceEntryHash)&&isHash(capture.baselineGeometrySha256),'Missing checkpoint provenance hashes');
 check(Number.isInteger(capture.authoredEvents)&&capture.authoredEvents>=1&&capture.authoredEvents===capture.state.authoredEventsUsed,'Author event count mismatch');
 if(capture.excludedEventIds!==undefined){
  check(isHash(capture.withdrawalIndexHash)&&Array.isArray(capture.excludedEventIds)&&capture.excludedEventIds.length>0&&new Set(capture.excludedEventIds).size===capture.excludedEventIds.length&&capture.excludedEventIds.every(id=>/^evt:[a-z0-9_-]+$/.test(id)),'Invalid withdrawal provenance in sealed rule state');
 }else check(capture.withdrawalIndexHash===undefined,'Partial withdrawal provenance');
 check(isHash(capture.payloadHash),'Missing life state payload hash');
 const {payloadHash,...body}=capture;
 check(await sha(canonicalJSON(body))===payloadHash,'Life capture payload modified');
 if(entry){check(entry.payloadHash===capture.payloadHash&&entry.sourceEventHead===capture.sourceEventHead&&entry.capturedAt===capture.capturedAt&&entry.engineSha256===capture.engineSha256&&entry.archiveSourceEntryHash===capture.archiveSourceEntryHash&&entry.authoredEvents===capture.authoredEvents&&
 JSON.stringify(entry.excludedEventIds??[])===JSON.stringify(capture.excludedEventIds??[])&&entry.withdrawalIndexHash===capture.withdrawalIndexHash,'Life capture index mismatch');}
 if(knownEventHeads)check(knownEventHeads.has(capture.sourceEventHead),'Life capture refers to an unknown or withdrawn event head');
 return true;
}
