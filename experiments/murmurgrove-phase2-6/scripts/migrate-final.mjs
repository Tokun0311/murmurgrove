/** Non-destructive Phase 4+ migration.
 * Only CREATE two new empty indexes if missing. Never overwrite an existing
 * index, event, screenshot, source checkpoint, state, or user-authored file.
 */
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {canonicalJSON} from '../public/version-chronicle.mjs';
import {verifyWithdrawalIndex} from '../public/withdrawals.mjs';
import {verifyClaimReviewIndex} from '../public/claim-review.mjs';
import {verifyLivedIndex} from '../public/lived-events.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
const sha=x=>createHash('sha256').update(x).digest('hex');
const read=async f=>JSON.parse(await readFile(join(root,f),'utf8'));
const lived=await read('data/lived-events/index.json');await verifyLivedIndex(lived,async s=>sha(s));
for(const [file,schema,validate] of [
 ['data/withdrawals/index.json','murmurgrove.withdrawal-ledger.v1',x=>verifyWithdrawalIndex(x,async s=>sha(s),{livedIndex:lived})],
 ['data/source-reviews/index.json','murmurgrove.source-review-index.v1',x=>verifyClaimReviewIndex(x,async s=>sha(s))]]){
 let exists=true;let current;
 try{current=await read(file);}catch(e){if(e.code==='ENOENT')exists=false;else throw e;}
 if(exists){await validate(current);console.log('PRESERVED existing',file,'(never overwritten)');continue;}
 const body={schema,entries:[]};body.indexHash=sha(canonicalJSON(body));
 await mkdir(dirname(join(root,file)),{recursive:true});
 try{await writeFile(join(root,file),JSON.stringify(body,null,2)+'\n',{flag:'wx'});}
 catch(e){if(e.code!=='EEXIST')throw e;}
 await validate(await read(file));
 console.log('CREATED new empty index',file);
}
console.log('Safe Phase 4 migration complete. No source evidence was deleted, overwritten or automatically attested.');
