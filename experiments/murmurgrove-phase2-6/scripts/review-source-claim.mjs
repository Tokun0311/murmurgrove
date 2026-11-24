/** Manual evidence review for existing source metadata or existing Writing.
 * Never adds a graph edge, archive record or physiological event.
 * Example: node scripts/review-source-claim.mjs --kind relation --from concept:foo --to institution:bar --note "I examined ..." --author-approved
 * Writing claims additionally REQUIRE actual markdown bytes under site's src/data.
 */
import {readFile,writeFile,rename,mkdir,realpath} from 'node:fs/promises';
import {join,resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {canonicalJSON,verifyChronicle} from '../public/version-chronicle.mjs';
import {validateClaimReview,verifyClaimReviewIndex,REVIEW_SCHEMA,REVIEW_ATTEST} from '../public/claim-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
const site=resolve(root,'../../..'),sha=s=>createHash('sha256').update(s).digest('hex');
const o={};for(let i=2;i<process.argv.length;i++){
 const k=process.argv[i];if(k==='--author-approved'){o.approved=true;continue;}
 if(!['--kind','--record','--from','--to','--note'].includes(k)||!process.argv[i+1]||process.argv[i+1].startsWith('--')||Object.hasOwn(o,k))throw Error('Unrecognized or duplicate review argument: '+k);
 o[k]=process.argv[++i];
}
if(!o.approved||!o['--note']||!['writing','relation'].includes(o['--kind']))throw Error('Author approval, kind and concrete note required; see README-FINAL.md');
const raw=async p=>readFile(join(root,p)),json=async p=>JSON.parse(await raw(p));
const chron=await json('data/chronicle/index.json');await verifyChronicle(chron,async t=>sha(t));
const head=chron.entries.at(-1);
const navBytes=await raw(head.sourceFiles.navigation),nav=JSON.parse(navBytes);
if(sha(navBytes)!==head.sourceSha256.navigation)throw Error('Source version navigation bytes changed');
const kind=o['--kind']==='writing'?'writing-source':'existing-relation';
const recordIds=kind==='writing-source'?[o['--record']]:[o['--from'],o['--to']];
let sourcePath=null,sourceSha256=sha(navBytes);
if(kind==='writing-source'){
 const record=nav.records.find(r=>r.id===recordIds[0]&&!r.quarantined&&r.kind==='writing');
 if(!record)throw Error('No genuine Writing record in source version. A zero-Writing baseline cannot be artificially activated.');
 if(!record.source?.startsWith('src/data/')||record.source.includes('..'))throw Error('Untrusted writing source path');
 sourcePath=record.source;
 const original=await realpath(join(site,sourcePath)),siteRoot=await realpath(site);
 if(!original.startsWith(siteRoot+sep))throw Error('Writing source escapes the archive');
 sourceSha256=sha(await readFile(original));
}
const report={schema:REVIEW_SCHEMA,kind,recordIds,sourcePath,sourceSha256,sourceCheckpointHash:head.entryHash,
 note:o['--note'].trim(),approvedAt:new Date().toISOString(),attestation:REVIEW_ATTEST};
validateClaimReview(report,{navigation:nav,rawSourceHash:sourceSha256,sourceCheckpointHash:head.entryHash});
const indexPath='data/source-reviews/index.json',index=await json(indexPath);
await verifyClaimReviewIndex(index,async t=>sha(t));
const key=kind+':'+[...recordIds].sort().join('|')+':'+sourceSha256;
for(const e of index.entries){
 const prior=JSON.parse(await raw(e.file));
 if(sha(await raw(e.file))!==e.reviewSha256)throw Error('Previously sealed review bytes changed');
 if(prior.kind+':'+[...prior.recordIds].sort().join('|')+':'+prior.sourceSha256===key)throw Error('Already reviewed these exact source facts; no duplicate');
}
const id='review-'+report.approvedAt.replace(/[-:.]/g,'').replace('T','t').replace('Z','z')+'-'+sha(canonicalJSON(report)).slice(0,12);
const file=`data/source-reviews/records/${id}.json`,stored=JSON.stringify(report,null,2)+'\n';
const item={seq:index.entries.length+1,id,file,kind,reviewSha256:sha(stored),sourceCheckpointHash:head.entryHash,previousEntryHash:index.entries.at(-1)?.entryHash??null};
item.entryHash=sha(canonicalJSON(item));const next={schema:index.schema,entries:[...index.entries,item]};next.indexHash=sha(canonicalJSON(next));
await verifyClaimReviewIndex(next,async t=>sha(t));
await mkdir(dirname(join(root,file)),{recursive:true});await writeFile(join(root,file),stored,{flag:'wx'});
const pending=join(root,indexPath+'.pending');await writeFile(pending,JSON.stringify(next,null,2)+'\n',{flag:'wx'});await rename(pending,join(root,indexPath));
console.log('APPROVED SOURCE REVIEW:',id);
console.log('Records:',recordIds.join(' / '),'| kind:',kind);
console.log('Not an activated Writing fiber, new relation, or personal life event.');
console.log('Private record: exclude from public upload; public preview compiler omits it.');
