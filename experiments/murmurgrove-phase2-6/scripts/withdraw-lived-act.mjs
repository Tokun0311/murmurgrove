/** Author-approved local suspension of an attested act.
 * The event and hash-chain remain preserved in the PRIVATE workspace, while
 * public viewer semantics and all derived present states ignore the withdrawn
 * act. This is not deletion from disk, Git history, replicas or backups.
 * node scripts/withdraw-lived-act.mjs --event-id evt:... --author-approved
 */
import {readFile,writeFile,rename} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {verifyWithdrawalIndex,appendWithdrawal} from '../public/withdrawals.mjs';
import {verifyLivedIndex} from '../public/lived-events.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
const hash=t=>createHash('sha256').update(t).digest('hex');
const [flag,id,approval]=process.argv.slice(2);
if(flag!=='--event-id'||!id||approval!=='--author-approved'||process.argv.length!==5)throw Error('Usage: node scripts/withdraw-lived-act.mjs --event-id evt:... --author-approved (author only)');
const read=async p=>JSON.parse(await readFile(join(root,p),'utf8'));
const lived=await read('data/lived-events/index.json');
const path=join(root,'data/withdrawals/index.json');
const withdrawal=JSON.parse(await readFile(path,'utf8'));
await verifyLivedIndex(lived,async t=>hash(t));
await verifyWithdrawalIndex(withdrawal,async t=>hash(t),{livedIndex:lived});
const record=lived.entries.find(e=>e.eventId===id);
if(!record)throw Error('No such sealed event');
const raw=await readFile(join(root,record.file));
if(hash(raw)!==record.rawSha256)throw Error('Original event evidence hash mismatch');
const next=await appendWithdrawal(withdrawal,{eventId:id,eventRawSha256:record.rawSha256,withdrawnAt:new Date().toISOString()},async t=>hash(t));
await verifyWithdrawalIndex(next,async t=>hash(t),{livedIndex:lived});
const temp=path+'.new';await writeFile(temp,JSON.stringify(next,null,2)+'\n',{flag:'wx'});await rename(temp,path);
console.log('WITHDRAWAL RECORDED for',id);
console.log('Reload the viewer: this act will no longer contribute to the life model.');
console.log('Original private evidence and derived snapshots STILL EXIST on disk and possibly in Git history; this is a suppression tombstone, NOT erasure.');
console.log('Never publish this private workspace. Use BUILD-PUBLIC-PREVIEW.cmd for an evidence-free bundle.');
