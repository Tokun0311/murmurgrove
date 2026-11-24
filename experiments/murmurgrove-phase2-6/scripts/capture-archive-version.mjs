/** Explicit, append-only archive SOURCE checkpoint capture. This is NOT
 * a life event, snapshot interpolation, historic organism playback, or an
 * updater for the live T0 renderer. Does not touch TOW ARCHIVE sources.
 *
 * Usage (after a verified two-file export):
 * node scripts/capture-archive-version.mjs --input <dir> --note <text>
 *      --source-ref <git-hash-or-audited-export-id> --author-approved
 */
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {canonicalJSON,verifyChronicle,compareArchiveSources} from '../public/version-chronicle.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
const data=join(root,'data');
const indexPath=join(data,'chronicle','index.json');
const digest=s=>createHash('sha256').update(s).digest('hex');
const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i++){
 const k=args[i];
 if(k==='--author-approved'){options.approved=true;continue;}
 if(!['--input','--note','--source-ref'].includes(k)||!args[i+1]||args[i+1].startsWith('--'))throw Error('Invalid capture option: '+k);
 if(Object.hasOwn(options,k))throw Error('Duplicate option: '+k);
 options[k]=args[++i];
}
if(!options.approved||!options['--input']||!options['--note']?.trim()||!options['--source-ref']?.trim()){
 throw Error('Usage: node scripts/capture-archive-version.mjs --input <verified-export-dir> --note <change-note> --source-ref <git-commit-or-export-id> --author-approved');
}
const input=resolve(options['--input']),sourceRaw={};
for(const [type,name] of [['baseline','known-data-baseline.v1.json'],['navigation','navigation.json']])sourceRaw[type]=await readFile(join(input,name));
const baseline=JSON.parse(sourceRaw.baseline.toString('utf8'));
const nav=JSON.parse(sourceRaw.navigation.toString('utf8'));
// Preserve the frozen baseline's actual evidence semantics. This script is for
// archive SOURCE revisions only; approved life events require their own engine.
if(baseline.schema!=='murmurgrove.known-data-baseline.v1'||nav.schema!=='murmurgrove.navigation.2.1.v1')throw Error('Not an authorized baseline/navigation export');
const {baselineProjectionHash,...baselineBody}=baseline;
if(baselineProjectionHash!==digest(JSON.stringify(baselineBody)))throw Error('Baseline projection fingerprint mismatch');
const {navigationHash,...navBody}=nav;
if(navigationHash!==digest(canonicalJSON(navBody)))throw Error('Navigation fingerprint mismatch');
if(nav.baselineProjectionHash!==baselineProjectionHash||nav.mode!=='SIMULATED_SANDBOX'||!Array.isArray(baseline.records)||!Array.isArray(nav.records)||!Array.isArray(nav.metadataLinks))throw Error('Baseline/navigation mismatch');
const sameIds=x=>new Set(x.map(r=>r.id));
const baselineIds=sameIds(baseline.records),navIds=sameIds(nav.records);
if(baselineIds.size!==baseline.records.length||navIds.size!==nav.records.length||baselineIds.size!==navIds.size||[...baselineIds].some(id=>!navIds.has(id)))throw Error('Record identity mismatch');
const baselineById=new Map(baseline.records.map(r=>[r.id,r]));
for(const record of nav.records){
 const source=baselineById.get(record.id);
 if(['kind','title','source','occurredOn','verification'].some(key=>canonicalJSON(record[key]??null)!==canonicalJSON(source?.[key]??null)))throw Error('Baseline/navigation source record mismatch: '+record.id);
 if(record.quarantined!==(record.verification==='needs-review'))throw Error('Quarantine flag is inconsistent with source verification: '+record.id);
}
if(baseline.counts.approvedLifeEvents!==0||baseline.counts.activeFibers!==0||nav.metadataLinks.some(l=>l.activated||l.status!=='METADATA_ONLY'||!navIds.has(l.from)||!navIds.has(l.to)))throw Error('Source-only history cannot assert activated physiology');
const rawIndex=await readFile(indexPath,'utf8'),index=JSON.parse(rawIndex);
await verifyChronicle(index,async text=>digest(text));
// Recheck every existing checkpoint's raw evidence before appending.
for(const entry of index.entries){for(const kind of ['baseline','navigation']){
 const current=await readFile(join(root,entry.sourceFiles[kind]));
 if(digest(current)!==entry.sourceSha256[kind])throw Error('Existing checkpoint bytes have changed: '+entry.id);
}}
const latest=index.entries.at(-1);
if(digest(sourceRaw.baseline)===latest.sourceSha256.baseline&&digest(sourceRaw.navigation)===latest.sourceSha256.navigation)throw Error('No new source revision: byte-identical to latest checkpoint');
const prevNav=JSON.parse(await readFile(join(root,latest.sourceFiles.navigation),'utf8'));
const changes=compareArchiveSources(prevNav,nav);
// Require a substantive change in the declared archive content. A timestamp,
// note, order or formatting update alone must not become a false state event.
if(!changes.recordsAdded&&!changes.recordsRemoved&&!changes.recordsEdited&&!changes.referencesAdded&&!changes.referencesRemoved)throw Error('No substantive source record or metadata relation changes');
const capturedAt=new Date().toISOString();
const id='source-'+capturedAt.replace(/[-:.]/g,'').replace('T','t').replace('Z','z').slice(0,16)+'-'+digest(sourceRaw.baseline).slice(0,9);
const newFolder=join(data,'chronicle','states',id);
const sourceCalendarDate=baseline.provenance?.baselineCalendarDate??null;
const visibleIds=new Set(nav.records.filter(r=>!r.quarantined).map(r=>r.id));
const visibleLinks=nav.metadataLinks.filter(l=>visibleIds.has(l.from)&&visibleIds.has(l.to)&&!l.activated);
const adjacency=new Map([...visibleIds].map(id=>[id,0]));
for(const e of visibleLinks){adjacency.set(e.from,adjacency.get(e.from)+1);adjacency.set(e.to,adjacency.get(e.to)+1);}
const entry={
 seq:index.entries.length,id,kind:'archive-source-checkpoint',label:'Source revision '+index.entries.length,
 sourceCalendarDate,capturedAt,timestampPrecision:'captured-at-utc; source-calendar-day-is-not-ingest-time',
 note:options['--note'].trim(),sourceRef:options['--source-ref'].trim(),
 sourceFiles:{baseline:`data/chronicle/states/${id}/baseline.json`,navigation:`data/chronicle/states/${id}/navigation.json`},
 sourceSha256:{baseline:digest(sourceRaw.baseline),navigation:digest(sourceRaw.navigation)},
 baselineProjectionHash,navigationHash,auditProjectionHash:baseline.provenance?.auditProjectionHash,
 counts:{records:nav.records.length,displayed:visibleIds.size,quarantined:nav.records.length-visibleIds.size,
  metadataReferences:nav.metadataLinks.length,verifiedVisibleReferences:visibleLinks.length,
  independentVisibleRecords:[...adjacency.values()].filter(degree=>degree===0).length,approvedLifeEvents:0},
 changes,opticalGeometry:null,authorApproval:'manual-user-attestation',previousEntryHash:latest.entryHash
};
if(!/^[0-9a-f]{64}$/.test(entry.auditProjectionHash||''))throw Error('Invalid audit projection fingerprint');
entry.entryHash=digest(canonicalJSON(entry));
const updated={schema:index.schema,mode:index.mode,entries:[...index.entries,entry]};
updated.indexHash=digest(canonicalJSON(updated));
await verifyChronicle(updated,async text=>digest(text));
// Content-addressed immutable copies, then index swap. Never overwrite a state.
await mkdir(dirname(newFolder),{recursive:true});
await mkdir(newFolder,{recursive:false});
await writeFile(join(newFolder,'baseline.json'),sourceRaw.baseline,{flag:'wx'});
await writeFile(join(newFolder,'navigation.json'),sourceRaw.navigation,{flag:'wx'});
const tmp=indexPath+'.new';
await writeFile(tmp,JSON.stringify(updated,null,2)+'\n',{flag:'wx'});
await rename(tmp,indexPath);
console.log('Archive source version sealed:',id);
console.log('Captured at:',capturedAt,'(NOT an exhibition or biological event date)');
console.log('Changes:',JSON.stringify(changes));
console.log('Review and commit experiments/murmurgrove-phase2-6/public/data/chronicle/ with Git.');
