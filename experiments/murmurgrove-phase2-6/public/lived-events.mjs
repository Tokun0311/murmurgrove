/** Phase 3.1 · Explicit user-attested lived-activity ledger.
 * Compatible event shape with Phase 1A. This is a sealed account of an
 * author-confirmed act, NOT automatic proof of the act or a morphology engine.
 * The initial index is empty; tests use synthetic, NEVER published events.
 */
import {canonicalJSON} from './version-chronicle.mjs';
export const LIVED_INDEX_SCHEMA='murmurgrove.lived-ledger.v1';
export const LIVED_DRAFT_SCHEMA='murmurgrove.lived-draft.v1';
export const LIVED_SEALED_SCHEMA='murmurgrove.lived-evidence.v1';
export const ATTESTATION='I_CONFIRM_THIS_RESEARCH_ACTION_OCCURRED';
export const LIVED_KINDS={
 'life.encounter':'重新接触 / Encounter',
 'life.reinterpretation':'重新理解 / Reinterpretation'
};
const HEX=/^[0-9a-f]{64}$/;
const ID=/^evt:[a-z0-9_-]+$/;
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/;
function check(ok,reason){if(!ok)throw Error(reason);}
export function validInstant(t){return typeof t==='string'&&ISO.test(t)&&!Number.isNaN(Date.parse(t))&&new Date(t).toISOString().replace('.000Z','Z')===t.replace('.000Z','Z');}
const only=(v,fields)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>fields.includes(k))&&fields.every(k=>Object.hasOwn(v,k));
export function makeLivedDraft({recordId,kind,note,evidenceUrl='',recordedAt,nonce,baselineProjectionHash,archiveSourceEntryHash}){
 const result={schema:LIVED_DRAFT_SCHEMA,kind,recordId,note:note?.trim(),evidenceUrl:evidenceUrl?.trim()||null,
  recordedAt,nonce,baselineProjectionHash,archiveSourceEntryHash,authorAttestation:ATTESTATION};
 validateLivedDraft(result);
 return result;
}
export function validateLivedDraft(d){
 check(only(d,['schema','kind','recordId','note','evidenceUrl','recordedAt','nonce','baselineProjectionHash','archiveSourceEntryHash','authorAttestation']),'Invalid lived activity draft fields');
 check(d.schema===LIVED_DRAFT_SCHEMA,'Invalid lived activity draft schema');
 check(Object.hasOwn(LIVED_KINDS,d.kind),'This action kind is not enabled without additional evidence');
 check(typeof d.recordId==='string'&&/^(concept|writing|exhibition|person|institution):[a-z0-9][a-z0-9_-]*$/.test(d.recordId),'Invalid record reference');
 check(typeof d.note==='string'&&d.note.length>=12&&d.note.length<=500,'A concrete 12–500 character first-person note is required');
 check(d.evidenceUrl===null||(typeof d.evidenceUrl==='string'&&d.evidenceUrl.length<=500&&/^https:\/\/[^\s@]+$/i.test(d.evidenceUrl)),'Optional evidence URL must be public HTTPS');
 check(validInstant(d.recordedAt),'Author confirmation requires a real UTC timestamp');
 check(typeof d.nonce==='string'&&/^[a-f0-9]{16,64}$/.test(d.nonce),'Invalid draft nonce');
 check(HEX.test(d.baselineProjectionHash)&&HEX.test(d.archiveSourceEntryHash),'Missing pinned archive source');
 check(d.authorAttestation===ATTESTATION,'Explicit author attestation is mandatory');
 return true;
}
export function eventIdForDraft(d){validateLivedDraft(d);return 'evt:'+d.recordedAt.replace(/[-:.]/g,'').replace('T','t').replace('Z','z')+'_'+d.nonce.slice(0,12);}
export function makeSealedLivedEvidence(d,{seq,recordPath,archiveCheckpointId,sealedAt}){
 validateLivedDraft(d);
 check(Number.isSafeInteger(seq)&&seq>=1,'Invalid event sequence');
 check(typeof recordPath==='string'&&/^\/(exhibitions|concepts|people|institutions|writing)\/[^?#]+\/$/.test(recordPath),'Invalid archive route');
 check(typeof archiveCheckpointId==='string'&&/^[a-z0-9-]+$/.test(archiveCheckpointId),'Invalid archive checkpoint');
 check(validInstant(sealedAt),'Invalid sealing time');
 const event={schema:'murmurgrove.event.v1',seq,eventId:eventIdForDraft(d),kind:d.kind,recordedAt:d.recordedAt,effectiveAt:d.recordedAt,
  payload:{recordRefs:[d.recordId],linkRefs:[],note:d.note}};
 if(d.kind==='life.reinterpretation')event.payload.interpretedOn=d.recordedAt.slice(0,10);
 return {schema:LIVED_SEALED_SCHEMA,event,source:{archiveCheckpointId,archiveSourceEntryHash:d.archiveSourceEntryHash,
   baselineProjectionHash:d.baselineProjectionHash,recordPath,evidenceUrl:d.evidenceUrl,attestation:d.authorAttestation},
  sealedAt};
}
export function validateSealedLivedEvidence(x,{record,checkpoint,seq}={}){
 check(only(x,['schema','event','source','sealedAt'])&&x.schema===LIVED_SEALED_SCHEMA,'Invalid sealed lived evidence');
 const e=x.event,s=x.source;
 check(only(e,['schema','seq','eventId','kind','recordedAt','effectiveAt','payload'])&&e.schema==='murmurgrove.event.v1','Invalid Phase 1A event envelope');
 check(Number.isSafeInteger(e.seq)&&e.seq>=1&&(seq===undefined||e.seq===seq),'Invalid or out-of-order sequence');
 check(ID.test(e.eventId)&&Object.hasOwn(LIVED_KINDS,e.kind),'Unapproved life event type');
 check(validInstant(e.recordedAt)&&e.effectiveAt===e.recordedAt&&validInstant(x.sealedAt),'Invalid event or sealing chronology');
 check(Date.parse(x.sealedAt)>=Date.parse(e.recordedAt),'Seal cannot precede author confirmation');
 const fields=e.kind==='life.reinterpretation'?['recordRefs','linkRefs','note','interpretedOn']:['recordRefs','linkRefs','note'];
 check(only(e.payload,fields),'Unsupported life payload');
 check(Array.isArray(e.payload.recordRefs)&&e.payload.recordRefs.length===1&&typeof e.payload.recordRefs[0]==='string','Exactly one verified record required');
 check(Array.isArray(e.payload.linkRefs)&&e.payload.linkRefs.length===0,'Links cannot be implied from a personal action');
 check(typeof e.payload.note==='string'&&e.payload.note.length>=12&&e.payload.note.length<=500,'Missing concrete author note');
 if(e.kind==='life.reinterpretation')check(e.payload.interpretedOn===e.recordedAt.slice(0,10),'No backdating of reinterpretation');
 check(only(s,['archiveCheckpointId','archiveSourceEntryHash','baselineProjectionHash','recordPath','evidenceUrl','attestation']),'Invalid source declaration');
 check(HEX.test(s.archiveSourceEntryHash)&&HEX.test(s.baselineProjectionHash)&&s.attestation===ATTESTATION,'Missing author confirmation or source hash');
 check(typeof s.recordPath==='string'&&s.recordPath.startsWith('/')&&s.recordPath.endsWith('/'),'Invalid source record route');
 check(s.evidenceUrl===null||(typeof s.evidenceUrl==='string'&&s.evidenceUrl.length<=500&&/^https:\/\/[^\s@]+$/i.test(s.evidenceUrl)),'Invalid evidence URL');
 if(record)check(record.id===e.payload.recordRefs[0]&&record.path===s.recordPath&&!record.quarantined,'Source record does not match attested event');
 if(checkpoint)check(s.archiveSourceEntryHash===checkpoint.entryHash&&s.baselineProjectionHash===checkpoint.baselineProjectionHash&&s.archiveCheckpointId===checkpoint.id,'Unrecognized archive source checkpoint');
 return true;
}
export async function verifyLivedIndex(index,shaText){
 check(only(index,['schema','entries','indexHash'])&&index.schema===LIVED_INDEX_SCHEMA&&Array.isArray(index.entries),'Invalid lived ledger index');
 check(HEX.test(index.indexHash)&&await shaText(canonicalJSON({schema:index.schema,entries:index.entries}))===index.indexHash,'Lived ledger index digest mismatch');
 let previous=null,lastTime=-Infinity;const ids=new Set();
 for(let i=0;i<index.entries.length;i++){
  const e=index.entries[i];check(only(e,['seq','eventId','kind','recordId','recordedAt','file','rawSha256','archiveSourceEntryHash','previousEntryHash','entryHash']),'Invalid ledger entry fields');
  check(e.seq===i+1&&ID.test(e.eventId)&&!ids.has(e.eventId),'Out of order or duplicate lived event');ids.add(e.eventId);
  check(Object.hasOwn(LIVED_KINDS,e.kind)&&/^((concept|writing|exhibition|person|institution):)/.test(e.recordId)&&validInstant(e.recordedAt),'Invalid ledger event reference');
  check(HEX.test(e.rawSha256)&&HEX.test(e.archiveSourceEntryHash)&&HEX.test(e.entryHash),'Missing ledger digest');
  check(e.file===`data/lived-events/events/${e.eventId.slice(4)}.json`,'Unsafe lived event file path');
  check(e.previousEntryHash===previous,'Broken lived ledger chain');
  check(Date.parse(e.recordedAt)>=lastTime,'Lived ledger timestamp order is not monotonic');lastTime=Date.parse(e.recordedAt);
  const {entryHash,...body}=e;check(await shaText(canonicalJSON(body))===entryHash,'Lived event entry hash mismatch');
  previous=e.entryHash;
 }
 return {valid:true,count:index.entries.length};
}
export function referencedLivedTraces(envelopes){
 const map=new Map();for(const x of envelopes){const id=x.event.payload.recordRefs[0];const item=map.get(id)||{encounter:0,reinterpretation:0,latestAt:null};
  if(x.event.kind==='life.encounter')item.encounter++;else item.reinterpretation++;
  if(!item.latestAt||x.event.recordedAt>item.latestAt)item.latestAt=x.event.recordedAt;
  map.set(id,item);
 }return map;
}
