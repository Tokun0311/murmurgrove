import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createEditor} from '../server.mjs';
import {buildGraph} from '../research-core.mjs';
import {readCurrentResearch} from '../../public/murmurgrove/organism/research-current-overlay.mjs';
import {datedExhibitionLedger} from '../../public/murmurgrove/organism/observation-history.mjs';
import {archiveDay} from '../../src/lib/exhibition-engagement.mjs';
test('visit, research and plan publication and conversion retain distinct dates',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mg-eng-'));let app;
 try{
 for(const t of ['people','institutions','exhibitions','concepts','writing'])await fs.mkdir(path.join(root,'src/data',t),{recursive:true});
 await fs.writeFile(path.join(root,'src/content.config.ts'),'// fixture');
 app=await createEditor({root,port:0,privateRoot:path.join(root,'.private')});const base=app.address;
 const get=async route=>(await fetch(base+route)).json();const token=(await get('/api/bootstrap')).token;
 const post=async(route,p)=>{const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json',origin:base,'x-editor-token':token},body:JSON.stringify(p)});return {status:r.status,data:await r.json()}};
 const fields={title:'Event',region:'Bern',location:'Venue',kind:'exhibition'};
 const publish=(slug,f,hash)=>post('/api/publish',{type:'exhibitions',slug,fields:{...fields,...f},body:'Archive note.',hash,confirmPublic:true});
 assert.equal((await publish('legacy',{visitedOn:'2026-11-27'})).status,200);
 assert.equal((await publish('research',{engagement:'researched'})).status,422);
 assert.equal((await publish('research',{engagement:'researched',researchOn:'2026-11-27',visitedOn:'1969-03-22'})).status,422);
 assert.equal((await publish('research',{engagement:'researched',researchOn:'2026-11-27',exhibitionStart:'1969-03-22',researchSources:'Catalogue'})).status,200);
 assert.equal((await publish('plan',{engagement:'planned',recordedOn:'2026-11-27',plannedOn:'2027-06-01'})).status,200);
 const research=await get('/api/record?type=exhibitions&slug=research');assert.equal(research.fields.visitedOn,undefined);assert.equal(research.fields.dateLabel,undefined);assert.equal(archiveDay(research.fields),'2026-11-27');
 let graph=await buildGraph(root);let overlay=readCurrentResearch(graph);assert.ok(overlay.records.has('exhibition:research'));assert.ok(!overlay.records.has('exhibition:plan'));assert.deepEqual(datedExhibitionLedger([...overlay.records.values()]).map(x=>x.id),['exhibition:legacy']);
 const plan=await get('/api/record?type=exhibitions&slug=plan');assert.equal((await publish('plan',{engagement:'visited',visitedOn:'2027-06-01',recordedOn:plan.fields.recordedOn},plan.hash)).status,200);
 graph=await buildGraph(root);overlay=readCurrentResearch(graph);assert.ok(overlay.records.has('exhibition:plan'));assert.equal(overlay.records.get('exhibition:plan').occurredOn,'2027-06-01');
 }finally{await app?.close();await fs.rm(root,{recursive:true,force:true});}
});
