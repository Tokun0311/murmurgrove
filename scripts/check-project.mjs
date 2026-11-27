// Read-only regression runner, compatible with Windows CMD and POSIX.
import {readdirSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const files=['tests','murmurgrove-editor/tests'].flatMap(dir=>readdirSync(path.join(root,dir)).filter(n=>n.endsWith('.test.mjs')).sort().map(n=>path.join(dir,n)));
if(!files.length)throw Error('No tests found');
const result=spawnSync(process.execPath,['--experimental-strip-types','--test',...files],{cwd:root,stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
