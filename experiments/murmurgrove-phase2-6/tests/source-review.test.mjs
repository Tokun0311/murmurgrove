import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {REVIEW_SCHEMA,REVIEW_ATTEST,validateClaimReview,verifyClaimReviewIndex} from '../public/claim-review.mjs';
const home=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=x=>createHash('sha256').update(x).digest('hex');
const nav=JSON.parse(await readFile(join(home,'public/data/navigation.json')));
const chron=JSON.parse(await readFile(join(home,'public/data/chronicle/index.json')));
const navBytes=await readFile(join(home,'public/data/navigation.json'));
const sourceCheckpointHash=chron.entries[0].entryHash;
const link=nav.metadataLinks.find(e=>!nav.records.find(r=>r.id===e.from)?.quarantined&&!nav.records.find(r=>r.id===e.to)?.quarantined);
const make=(changes={})=>({schema:REVIEW_SCHEMA,kind:'existing-relation',recordIds:[link.from,link.to],sourcePath:null,
 sourceSha256:sha(navBytes),sourceCheckpointHash,note:'I personally reviewed the existing metadata relationship and its two source records.',
 approvedAt:'2026-11-24T01:00:00.000Z',attestation:REVIEW_ATTEST,...changes});
test('a reviewed existing relation is source evidence only, not an activated organism edge',()=>{
 const review=make();
 assert.equal(validateClaimReview(review,{navigation:nav,rawSourceHash:sha(navBytes),sourceCheckpointHash}),true);
 assert.equal(Object.hasOwn(review,'lifeEvent'),false);
 assert.equal(Object.hasOwn(review,'activatedFiber'),false);
 assert.throws(()=>validateClaimReview(make({recordIds:[link.from,'institution:not-in-real-archive']}),{navigation:nav,rawSourceHash:sha(navBytes),sourceCheckpointHash}),/endpoints/i);
 assert.throws(()=>validateClaimReview(make({sourceSha256:'0'.repeat(64)}),{navigation:nav,rawSourceHash:sha(navBytes),sourceCheckpointHash}),/source bytes/i);
});
test('zero verified Writing records means Writing source attestation must remain unavailable',()=>{
 assert.equal(nav.records.filter(r=>r.kind==='writing'&&!r.quarantined).length,0);
 const writing=make({kind:'writing-source',recordIds:['writing:imaginary-work'],sourcePath:'src/data/writing/imaginary.md'});
 assert.throws(()=>validateClaimReview(writing,{navigation:nav,rawSourceHash:sha(navBytes),sourceCheckpointHash}),/No verified Writing source/i);
});
test('private source review ledger begins clean and rejects unsafe manual review',async()=>{
 const index=JSON.parse(await readFile(join(home,'public/data/source-reviews/index.json')));
 assert.equal((await verifyClaimReviewIndex(index,async s=>sha(s))).count,0);
 const d=await mkdtemp(join(tmpdir(),'murmurgrove-review-'));
 const files=['scripts/review-source-claim.mjs','public/claim-review.mjs','public/version-chronicle.mjs',
  'public/data/chronicle/index.json','public/data/navigation.json','public/data/source-reviews/index.json'];
 for(const f of files){await mkdir(dirname(join(d,f)),{recursive:true});await copyFile(join(home,f),join(d,f));}
 const invoke=(...args)=>spawnSync(process.execPath,[join(d,'scripts/review-source-claim.mjs'),...args],{encoding:'utf8'});
 const rejected=invoke('--kind','relation','--from',link.from,'--to',link.to,'--note','Reviewed this relationship source record.');
 assert.notEqual(rejected.status,0);
 const accepted=invoke('--kind','relation','--from',link.from,'--to',link.to,'--note','I personally examined the source entries for this metadata link.','--author-approved');
 assert.equal(accepted.status,0,accepted.stderr);
 const sealed=JSON.parse(await readFile(join(d,'public/data/source-reviews/index.json')));
 assert.equal(sealed.entries.length,1);await verifyClaimReviewIndex(sealed,async s=>sha(s));
 const again=invoke('--kind','relation','--from',link.from,'--to',link.to,'--note','I personally examined the source entries for this metadata link.','--author-approved');
 assert.notEqual(again.status,0);assert.match(again.stderr,/Already reviewed/i);
});
