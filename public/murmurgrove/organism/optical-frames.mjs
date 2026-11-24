/** Phase 3.0 · Attested present optical-frame evidence.
 * An exported screenshot is a recorded PRESENT renderer observation,
 * never an approved life event, historical physiological anatomy, or generated past.
 */
import {canonicalJSON} from './version-chronicle.mjs';
export const OPTICAL_FRAME_SCHEMA='murmurgrove.present-optical-frame.v1';
export const OPTICAL_INDEX_SCHEMA='murmurgrove.optical-frames.index.v1';
export const OPTICAL_CLAIM='OBSERVED_CANVAS_FRAME_NOT_HISTORICAL_PHYSIOLOGY';
export const PNG_PREFIX='data:image/png;base64,';
const hashPattern=/^[0-9a-f]{64}$/;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function validateFrameShape(frame){
 if(!frame||frame.schema!==OPTICAL_FRAME_SCHEMA||frame.claim!==OPTICAL_CLAIM||!Number.isSafeInteger(frame.approvedLifeEvents)||frame.approvedLifeEvents<0)throw Error('Not an optical frame; biological claims not accepted');
 if(frame.approvedLifeEvents>0&&!hashPattern.test(frame.lifeLedgerIndexHash))throw Error('Not an optical frame; missing attested event ledger provenance');
 if(!frame.png?.startsWith(PNG_PREFIX)||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(frame.png)||frame.png.length>8_000_000)throw Error('Invalid PNG data');
 if(!hashPattern.test(frame.pngSha256)||!hashPattern.test(frame.rendererSha256)||!hashPattern.test(frame.exportHash)||!hashPattern.test(frame.archiveSourceEntryHash)||!hashPattern.test(frame.opticalGeometrySha256))throw Error('Invalid evidence hashes');
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(frame.recordedAt)||!/Z$/.test(frame.frameRenderedAt)||!finite(Date.parse(frame.recordedAt))||!finite(Date.parse(frame.frameRenderedAt)))throw Error('Unverifiable capture time');
 if(Math.abs(Date.parse(frame.recordedAt)-Date.parse(frame.frameRenderedAt))>10_000)throw Error('Frame and capture timestamps too far apart');
 const camera=frame.camera;
 if(!camera||!['Whole','Growth','Movement'].includes(camera.mode)||!['angle','elevation','zoom'].every(k=>finite(camera[k]))||camera.zoom<.65||camera.zoom>24||!Array.isArray(camera.pan)||camera.pan.length!==2||!camera.pan.every(finite))throw Error('Invalid camera record');
 if(frame.nodeCount!==174||frame.edgeCount!==158||frame.isolatedNodeCount!==20||frame.activatedFibers!==0)throw Error('Frame provenance disagrees with frozen topology');
 if(!Array.isArray(frame.cssViewport)||frame.cssViewport.length!==2||!frame.cssViewport.every(n=>finite(n)&&n>0&&n<=5000))throw Error('Invalid CSS viewport');
 if(!Array.isArray(frame.pixelViewport)||frame.pixelViewport.length!==2||!frame.pixelViewport.every(n=>Number.isInteger(n)&&n>0&&n<=7500))throw Error('Invalid pixel viewport');
 if(!frame.rendererVersion||typeof frame.rendererVersion!=='string')throw Error('Missing renderer version');
 if(!Array.isArray(frame.screenNodes)||frame.screenNodes.length!==174)throw Error('Recorded pose must include 174 actual nodes');
 const seen=new Set();for(const entry of frame.screenNodes){
  if(!Array.isArray(entry)||entry.length!==3||typeof entry[0]!=='string'||seen.has(entry[0])||!finite(entry[1])||!finite(entry[2])||Math.abs(entry[1])>1e7||Math.abs(entry[2])>1e7)throw Error('Invalid or duplicate observed screen position');
  seen.add(entry[0]);
 }
 return true;
}
export async function verifyFrameEvidence(frame,shaText,shaBytes,decodePNG){
 validateFrameShape(frame);
 const png=decodePNG(frame.png.slice(PNG_PREFIX.length));
 if(await shaBytes(png)!==frame.pngSha256)throw Error('PNG SHA-256 mismatch');
 const {exportHash,...payload}=frame;
 if(await shaText(canonicalJSON(payload))!==exportHash)throw Error('Frame export SHA-256 mismatch');
 return png;
}
export async function verifyOpticalFrameIndex(index,shaText){
 if(!index||index.schema!==OPTICAL_INDEX_SCHEMA||!Array.isArray(index.entries)||!hashPattern.test(index.indexHash))throw Error('Invalid optical frame index');
 for(let i=0;i<index.entries.length;i++){
  const e=index.entries[i];if(e.seq!==i||e.kind!=='observed-optical-frame'||!/^frame-[0-9a-z-]+$/.test(e.id)||!hashPattern.test(e.rawSha256)||!hashPattern.test(e.exportHash)||!hashPattern.test(e.entryHash)||!hashPattern.test(e.rendererSha256)||!Number.isSafeInteger(e.approvedLifeEvents)||e.approvedLifeEvents<0||(e.approvedLifeEvents>0&&!hashPattern.test(e.lifeLedgerIndexHash))||e.previousEntryHash!==(i?index.entries[i-1].entryHash:null))throw Error('Invalid frame chain entry');
  if(e.file!==`data/optical-frames/states/${e.id}.json`)throw Error('Unsafe optical frame path');
  const {entryHash,...body}=e;
  if(await shaText(canonicalJSON(body))!==entryHash)throw Error('Optical frame chain broken');
 }
 const {indexHash,...body}=index;
 if(await shaText(canonicalJSON(body))!==indexHash)throw Error('Optical frame index hash mismatch');
 return true;
}
export function opticalFramePayload({png,recordedAt,frameRenderedAt,camera,cssViewport,pixelViewport,rendererSha256,archiveSourceEntryHash,opticalGeometrySha256,selectedId=null,screenNodes=[],authoredEventCount=0,lifeLedgerIndexHash=null}){
 return {
  schema:OPTICAL_FRAME_SCHEMA,claim:OPTICAL_CLAIM,recordedAt,frameRenderedAt,
  rendererVersion:'murmurgrove-phase3.0-present-capture',rendererSha256,
  archiveSourceEntryHash,opticalGeometrySha256,
  nodeCount:174,edgeCount:158,isolatedNodeCount:20,activatedFibers:0,approvedLifeEvents:authoredEventCount,...(lifeLedgerIndexHash?{lifeLedgerIndexHash}:{}),
  camera:{mode:camera.mode,angle:camera.angle,elevation:camera.elevation,zoom:camera.zoom,pan:[...camera.pan]},
  cssViewport:[...cssViewport],pixelViewport:[...pixelViewport],selectedId,screenNodes:screenNodes.map(a=>[...a]),
  png
 };
}
