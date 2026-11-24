import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,copyFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {canonicalJSON} from '../public/version-chronicle.mjs';
import {OPTICAL_CLAIM,opticalFramePayload,verifyFrameEvidence,verifyOpticalFrameIndex,validateFrameShape} from '../public/optical-frames.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sha=b=>createHash('sha256').update(b).digest('hex');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p0UAAAAASUVORK5CYII=','base64');
const digest=async x=>sha(x);
async function sample(){
 const archive=JSON.parse(await readFile(join(root,'public/data/chronicle/index.json'),'utf8'));
 const recordedAt=new Date().toISOString(),frameRenderedAt=recordedAt;
 const f=opticalFramePayload({png:'data:image/png;base64,'+png.toString('base64'),recordedAt,frameRenderedAt,
   camera:{mode:'Movement',angle:.63,elevation:.2,zoom:.65,pan:[0,0]},cssViewport:[1,1],pixelViewport:[1,1],
   screenNodes:JSON.parse(await readFile(join(root,'public/data/T0.json'),'utf8')).nodes.map(n=>[n.id,100,100]),
   rendererSha256:sha(await readFile(join(root,'public/viewer.mjs'))),archiveSourceEntryHash:archive.entries[0].entryHash,
   opticalGeometrySha256:archive.entries[0].opticalGeometry.sha256});
 f.pngSha256=sha(png);f.exportHash=sha(canonicalJSON(f));return f;
}
test('real optical export is recorded-present and cannot claim approved life events',async()=>{
 const f=await sample();assert.equal(f.claim,OPTICAL_CLAIM);assert.equal(f.approvedLifeEvents,0);
 assert.equal(validateFrameShape(f),true);
 assert.deepEqual(await verifyFrameEvidence(f,digest,digest,s=>Buffer.from(s,'base64')),png);
 f.approvedLifeEvents=1;assert.throws(()=>validateFrameShape(f),/Not an optical frame/);
});
test('PNG, camera and momentary evidence cannot silently be altered',async()=>{
 const f=await sample();const modified={...f,recordedAt:'2020-01-01T00:00:00.000Z'};
 await assert.rejects(verifyFrameEvidence(modified,digest,digest,s=>Buffer.from(s,'base64')),/timestamps too far apart/);
 const wrong={...f,png:'data:image/png;base64,'+Buffer.from('fake','utf8').toString('base64')};
 await assert.rejects(verifyFrameEvidence(wrong,digest,digest,s=>Buffer.from(s,'base64')),/PNG SHA-256 mismatch/);
 const angle={...f,camera:{...f.camera,angle:8}};
 await assert.rejects(verifyFrameEvidence(angle,digest,digest,s=>Buffer.from(s,'base64')),/export SHA-256 mismatch/);
 const activation={...f,activatedFibers:1};assert.throws(()=>validateFrameShape(activation),/topology/);
 const fake={...f,screenNodes:f.screenNodes.map(r=>[...r])};fake.screenNodes[0][0]='faked:node';
 await assert.rejects(verifyFrameEvidence(fake,digest,digest,s=>Buffer.from(s,'base64')),/export SHA-256 mismatch/);
});
test('empty initial frame index validates and contains NO synthetic history',async()=>{
 const index=JSON.parse(await readFile(join(root,'public/data/optical-frames/index.json'),'utf8'));
 assert.equal(await verifyOpticalFrameIndex(index,digest),true);assert.equal(index.entries.length,0);
});
test('author-reviewed import seals a genuine browser export in isolated temp, rejects duplicate and tampering',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'murmurgrove-optical-frame-'));
 const mkdirp=async file=>mkdir(dirname(join(folder,file)),{recursive:true});
 const copy=async rel=>{await mkdirp(rel);await copyFile(join(root,rel),join(folder,rel));};
 for(const rel of ['scripts/import-optical-frame.mjs','public/optical-frames.mjs','public/version-chronicle.mjs','public/viewer.mjs',
 'public/data/optical-frames/index.json','public/data/chronicle/index.json','public/data/known-data-baseline.v1.json','public/data/navigation.json','public/data/T0.json'])await copy(rel);
 await writeFile(join(folder,'package.json'),'{}');
 const f=await sample();const incoming=join(folder,'captured-present.json');await writeFile(incoming,JSON.stringify(f));
 const run=(file=incoming)=>spawnSync(process.execPath,[join(folder,'scripts/import-optical-frame.mjs'),'--file',file,'--author-approved'],{encoding:'utf8'});
 let result=run();assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/PRESENT optical frame sealed/);
 const index=JSON.parse(await readFile(join(folder,'public/data/optical-frames/index.json'),'utf8'));
 assert.equal(index.entries.length,1);assert.equal(index.entries[0].approvedLifeEvents,0);
 assert.equal(await verifyOpticalFrameIndex(index,digest),true);
 assert.equal(sha(await readFile(join(folder,'public',index.entries[0].file))),index.entries[0].rawSha256);
 result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/already sealed/);
 const changed={...f,exportHash:'0'.repeat(64)};
 const falsified=join(folder,'falsified.json');await writeFile(falsified,JSON.stringify(changed));
 result=run(falsified);assert.notEqual(result.status,0);assert.match(result.stderr,/SHA-256 mismatch/);
});
test('history UI exposes three distinct evidence classes and capture is opt-in',async()=>{
 const html=await readFile(join(root,'public/index.html'),'utf8');const viewer=await readFile(join(root,'public/viewer.mjs'),'utf8');
 for(const id of ['historyFramesTab','historyFrameView','frameCapture','historyFrames','frameFull','frameFullClose'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(viewer,/archiveSourceEntryHash:base.entryHash/);assert.match(viewer,/canvas\.toDataURL\('image\/png'\)/);
 assert.match(viewer,/await verifyFrameEvidence\(/);assert.match(html,/不是历史生理形态/);
});
