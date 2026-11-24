import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const filePaths=['scripts/migrate-final.mjs','public/version-chronicle.mjs','public/withdrawals.mjs','public/claim-review.mjs','public/lived-events.mjs',
 'public/data/lived-events/index.json','public/data/withdrawals/index.json','public/data/source-reviews/index.json'];
test('safe final migration creates only missing ledgers and never resets existing ones',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'murmurgrove-migrate-'));
 for(const f of filePaths){await mkdir(dirname(join(temp,f)),{recursive:true});await copyFile(join(root,f),join(temp,f));}
 const wd=join(temp,'public/data/withdrawals/index.json'),sr=join(temp,'public/data/source-reviews/index.json');
 const savedWithdrawal=await readFile(wd);await rm(wd);await rm(sr);
 const run=()=>spawnSync(process.execPath,[join(temp,'scripts/migrate-final.mjs')],{encoding:'utf8',timeout:15000});
 const a=run();assert.equal(a.status,0,a.stderr);assert.match(a.stdout,/CREATED/);
 const created=await readFile(wd);assert.deepEqual(created,savedWithdrawal);
 const b=run();assert.equal(b.status,0,b.stderr);assert.match(b.stdout,/PRESERVED/);
 assert.deepEqual(await readFile(wd),created);
 // Deliberately corrupted existing ledger: migration must FAIL rather than erase it.
 await writeFile(wd,'{"unsafe":true}');
 const bad=run();assert.notEqual(bad.status,0);assert.equal((await readFile(wd,'utf8')),'{"unsafe":true}');
});
