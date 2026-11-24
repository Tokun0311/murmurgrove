import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const dir=resolve(dirname(fileURLToPath(import.meta.url)),'..');
test('publication gate is read-only and accepts untouched baseline with no personal events',async()=>{
 const before=await readFile(dir+'/public/data/lived-events/index.json','utf8');
 const res=spawnSync(process.execPath,[dir+'/scripts/prepublish-audit.mjs'],{encoding:'utf8',timeout:20000});
 assert.equal(res.status,0,res.stderr);assert.match(res.stdout,/No authored notes or optical captures/);
 assert.equal(await readFile(dir+'/public/data/lived-events/index.json','utf8'),before);
});
test('human publication review remains mandatory; source script does not auto-approve',async()=>{
 const text=await readFile(dir+'/scripts/prepublish-audit.mjs','utf8');
 const cmd=await readFile(dir+'/PRE-PUBLISH-AUDIT.cmd','utf8');
 assert.match(text,/PUBLICATION BLOCKED/);assert.match(text,/--author-reviewed-for-publication/);
 assert.doesNotMatch(cmd,/--author-reviewed-for-publication/);
 assert.doesNotMatch(cmd,/git push|git commit|deploy/i);
});
