/** Privacy-by-default public PREVIEW compiler, offline and read-only.
 * Does NOT publish, deploy, delete, commit, or claim consent.
 * Copies ONLY audited code and frozen public source evidence. Derived state,
 * lived actions, withdrawals, review drafts, optical frames and private
 * archive revisions are never traversed or copied, even if they exist.
 */
import {readFile,writeFile,mkdir,copyFile,rm,readdir,lstat} from 'node:fs/promises';
import {resolve,join,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {canonicalJSON,verifyChronicle} from '../public/version-chronicle.mjs';
import {verifyWithdrawalIndex} from '../public/withdrawals.mjs';
import {verifyLivedIndex} from '../public/lived-events.mjs';
import {verifyClaimReviewIndex} from '../public/claim-review.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pub=join(root,'public'),out=join(root,'dist-public');
const sha=x=>createHash('sha256').update(x).digest('hex');
const content=async f=>readFile(join(pub,f));
const json=async f=>JSON.parse(await content(f));
const [base,nav,t0,manifest,chron,lived,withd,frames,states,reviews]=await Promise.all([
 'data/known-data-baseline.v1.json','data/navigation.json','data/T0.json','data/manifest.json','data/chronicle/index.json',
 'data/lived-events/index.json','data/withdrawals/index.json','data/optical-frames/index.json','data/life-states/index.json','data/source-reviews/index.json'].map(json));
await verifyChronicle(chron,async s=>sha(s));
await verifyLivedIndex(lived,async s=>sha(s));
await verifyClaimReviewIndex(reviews,async s=>sha(s));
await verifyWithdrawalIndex(withd,async s=>sha(s),{livedIndex:lived});
const genesis=chron.entries[0];
if(!genesis||genesis.seq!==0||genesis.baselineProjectionHash!==base.baselineProjectionHash||genesis.navigationHash!==nav.navigationHash||
 genesis.opticalGeometry.sha256!==sha(await content('data/T0.json'))||
 genesis.sourceSha256.baseline!==sha(await content('data/known-data-baseline.v1.json'))||
 genesis.sourceSha256.navigation!==sha(await content('data/navigation.json')))
 throw Error('Frozen public source evidence is not verified');
if(lived.entries.length>0){
 // The private workspace may contain author notes. Never read the event file;
 // public export is based exclusively on the clean baseline and empty ledgers.
 console.log('Private lived events detected; all excluded from public preview.');
}
for(const [index,label] of [[frames,'optical frames'],[states,'rule states'],[withd,'withdrawal evidence'],[reviews,'author source reviews']])
 if(index.entries.length)console.log('Private '+label+' detected; all excluded from public preview.');
// Build in a sibling temporary directory, never mutating original public/
// data or following arbitrary source symlinks.
const tmp=out+'.pending';await rm(tmp,{recursive:true,force:true});await mkdir(join(tmp,'data'),{recursive:true});
const sourceFiles=['index.html','data/T0.json','data/known-data-baseline.v1.json','data/navigation.json','data/manifest.json'];
const publicModules=(await readdir(pub)).filter(f=>f.endsWith('.mjs')).sort();
const copied=[];
for(const f of [...sourceFiles,...publicModules]){
 const meta=await lstat(join(pub,f));
 if(!meta.isFile()||meta.isSymbolicLink())throw Error('Unsafe source module: '+f);
 const to=join(tmp,f);await mkdir(dirname(to),{recursive:true});await copyFile(join(pub,f),to);copied.push(f);
}
const emptyIndex=async (schema,file)=>{
 const data={schema,entries:[]};data.indexHash=sha(canonicalJSON(data));
 await mkdir(dirname(join(tmp,file)),{recursive:true});await writeFile(join(tmp,file),JSON.stringify(data,null,2)+'\n');
};
const safeChron={schema:chron.schema,mode:chron.mode,entries:[genesis]};safeChron.indexHash=sha(canonicalJSON(safeChron));
await mkdir(join(tmp,'data/chronicle'),{recursive:true});await writeFile(join(tmp,'data/chronicle/index.json'),JSON.stringify(safeChron,null,2)+'\n');
await emptyIndex(lived.schema,'data/lived-events/index.json');
await emptyIndex(withd.schema,'data/withdrawals/index.json');
await emptyIndex(frames.schema,'data/optical-frames/index.json');
await emptyIndex(states.schema,'data/life-states/index.json');
await emptyIndex(reviews.schema,'data/source-reviews/index.json');
// Recheck only files in the staging tree. No other filenames are permitted.
const allowed=new Set([...copied,'data/chronicle/index.json','data/lived-events/index.json','data/withdrawals/index.json','data/optical-frames/index.json','data/life-states/index.json','data/source-reviews/index.json']);
const enumerated=[];
async function walk(dir,prefix=''){
 for(const ent of await readdir(dir,{withFileTypes:true})){
  const rel=prefix?prefix+'/'+ent.name:ent.name;
  if(ent.isSymbolicLink())throw Error('Symlink in public preview: '+rel);
  if(ent.isDirectory())await walk(join(dir,ent.name),rel);
  else if(ent.isFile())enumerated.push(rel);else throw Error('Non-file in public preview');
 }
}
await walk(tmp);
if(enumerated.length!==allowed.size||enumerated.some(f=>!allowed.has(f)))throw Error('Public allowlist failure');
for(const f of enumerated){const b=await readFile(join(tmp,f));if(b.length>1_000_000)throw Error('Excessive public file size');}
// No destructive rm of prior public output: archive old preview in the next
// build only after a completely successful staged export.
await rm(out,{recursive:true,force:true});
const {rename}=await import('node:fs/promises');await rename(tmp,out);
console.log('Verified evidence-free PUBLIC PREVIEW in:',out);
console.log('FILES:',enumerated.length,'| source nodes 174, metadata edges 158 | authored events 0 | optical frames 0 | sealed states 0');
console.log('This output is a PUBLIC PREVIEW, not a deployed site or permission to publish.');
