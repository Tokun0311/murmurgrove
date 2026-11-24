/** Phase 3.0 · Review and seal a user-exported PRESENT optical frame.
 * Neither a biological snapshot nor an archive source revision.
 * Usage: node scripts/import-optical-frame.mjs --file <browser-export.json> --author-approved
 */
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {canonicalJSON} from '../public/version-chronicle.mjs';
import {verifyOpticalFrameIndex,verifyFrameEvidence} from '../public/optical-frames.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../public');
const indexPath=join(root,'data','optical-frames','index.json');
const args=process.argv.slice(2);
if(args.length!==3||args[0]!=='--file'||args[2]!=='--author-approved')throw Error('Usage: node scripts/import-optical-frame.mjs --file <browser-export.json> --author-approved');
const input=resolve(args[1]),raw=await readFile(input);
if(raw.byteLength>8_000_000)throw Error('Frame file exceeds safety limit');
const frame=JSON.parse(raw.toString('utf8'));
const image=await verifyFrameEvidence(frame,async s=>sha(s),async bytes=>sha(bytes),base64=>Buffer.from(base64,'base64'));
if(image.byteLength>5_000_000||image.byteLength<40)throw Error('PNG frame image size invalid');
if(!image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('PNG signature invalid');
if(image.toString('ascii',12,16)!=='IHDR'||image.readUInt32BE(16)!==frame.pixelViewport[0]||image.readUInt32BE(20)!==frame.pixelViewport[1])throw Error('PNG dimensions mismatch');
if(Date.parse(frame.recordedAt)>Date.now()+60_000)throw Error('Future optical frame rejected');
const archive=JSON.parse(await readFile(join(root,'data','chronicle','index.json'),'utf8'));
const source=archive.entries.find(e=>e.entryHash===frame.archiveSourceEntryHash);
if(!source)throw Error('Unrecognized archive source checkpoint');
// Older V3.0 frames may have zero authored events. New frames must not silently
// claim zero after live author-approved evidence exists.
if(frame.approvedLifeEvents>0){
 const ledger=JSON.parse(await readFile(join(root,'data','lived-events','index.json'),'utf8'));
 if(ledger.indexHash!==frame.lifeLedgerIndexHash||ledger.entries.length!==frame.approvedLifeEvents)throw Error('The sealed author-event ledger changed after this optical capture');
}
// This renderer currently uses precisely the original frozen T0 geometry.
// Avoid attributing a subsequent source revision to an older render.
if(source.seq!==0||source.opticalGeometry?.sha256!==frame.opticalGeometrySha256)throw Error('Capture does not match pinned T0 reference');
for(const type of ['baseline','navigation']){
 const bytes=await readFile(join(root,source.sourceFiles[type]));
 if(sha(bytes)!==source.sourceSha256[type])throw Error('Underlying archive evidence changed');
}
const referenceNav=JSON.parse(await readFile(join(root,source.sourceFiles.navigation),'utf8'));
const expectedNodes=new Set(referenceNav.records.filter(r=>!r.quarantined).map(r=>r.id));
if(expectedNodes.size!==174||frame.screenNodes.some(row=>!expectedNodes.has(row[0])))throw Error('Screenshot contains node identities not present in verified archive');
const t0bytes=await readFile(join(root,'data','T0.json'));
if(sha(t0bytes)!==frame.opticalGeometrySha256)throw Error('Optical geometry source changed');
const viewerBytes=await readFile(join(root,'viewer.mjs'));
if(sha(viewerBytes)!==frame.rendererSha256)throw Error('Viewer code is different from the code used for the capture. Re-export using the installed viewer.');
const index=JSON.parse(await readFile(indexPath,'utf8'));
await verifyOpticalFrameIndex(index,async s=>sha(s));
for(const e of index.entries){
 const old=await readFile(join(root,e.file));if(sha(old)!==e.rawSha256)throw Error('Previously sealed frame is modified: '+e.id);
}
if(index.entries.some(e=>e.exportHash===frame.exportHash))throw Error('This exact optical frame is already sealed');
const id='frame-'+frame.recordedAt.replace(/[-:.]/g,'').replace('T','t').replace('Z','z')+'-'+frame.exportHash.slice(0,10);
const rel=`data/optical-frames/states/${id}.json`;
const stored=JSON.stringify(frame,null,2)+'\n';
const previous=index.entries.at(-1);
const entry={seq:index.entries.length,id,kind:'observed-optical-frame',file:rel,rawSha256:sha(stored),exportHash:frame.exportHash,
 recordedAt:frame.recordedAt,rendererSha256:frame.rendererSha256,archiveSourceEntryHash:frame.archiveSourceEntryHash,
 frameMode:frame.camera.mode,approvedLifeEvents:frame.approvedLifeEvents,...(frame.approvedLifeEvents>0?{lifeLedgerIndexHash:frame.lifeLedgerIndexHash}:{}),previousEntryHash:previous?.entryHash??null};
entry.entryHash=sha(canonicalJSON(entry));
const updated={schema:index.schema,entries:[...index.entries,entry]};
updated.indexHash=sha(canonicalJSON(updated));
await verifyOpticalFrameIndex(updated,async s=>sha(s));
await mkdir(join(root,'data','optical-frames','states'),{recursive:true});
await writeFile(join(root,rel),stored,{flag:'wx'});
const temp=indexPath+'.pending';
await writeFile(temp,JSON.stringify(updated,null,2)+'\n',{flag:'wx'});
await rename(temp,indexPath);
console.log('PRESENT optical frame sealed:',id);
console.log('Recorded at:',frame.recordedAt);
console.log('This is a canvas observation, NOT historic physiology or a life event.');
console.log('Review and commit the new optical-frames files in GitHub Desktop.');
