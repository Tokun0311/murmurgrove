import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createEditor} from '../server.mjs';
test('Unicode person names, withdrawal, restore and deletion preserve independent records',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mg-remove-'));let app;
 try{
 for(const t of ['people','institutions','exhibitions','concepts','writing'])await fs.mkdir(path.join(root,'src/data',t),{recursive:true});
 await fs.writeFile(path.join(root,'src/content.config.ts'),'// fixture');
 app=await createEditor({root,port:0,privateRoot:path.join(root,'.private')});const base=app.address;
 const get=async route=>(await fetch(base+route)).json();const token=(await get('/api/bootstrap')).token;
 const post=async(route,p)=>{const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json',origin:base,'x-editor-token':token},body:JSON.stringify(p)});return {status:r.status,data:await r.json()}};
 const person={type:'people',slug:'ryuichi-sakamoto',fields:{name:'Ryuichi Sakamoto',nativeName:'坂本龍一',alternativeNames:['坂本龙一','사카모토 류이치'],kind:'artist'},body:'Person note.',confirmPublic:true};
 assert.equal((await post('/api/publish',person)).status,200);
 const r=await get('/api/record?type=people&slug=ryuichi-sakamoto');assert.equal(r.fields.nativeName,'坂本龍一');assert.deepEqual(r.fields.alternativeNames,person.fields.alternativeNames);
 assert.equal((await post('/api/publish',{type:'exhibitions',slug:'event',fields:{title:'Event',region:'Tokyo',location:'Venue',kind:'exhibition',visitedOn:'2026-11-27',artists:['ryuichi-sakamoto']},body:'Independent exhibition.',confirmPublic:true})).status,200);
 const preview=await get('/api/record-removal-preview?type=people&slug=ryuichi-sakamoto');assert.equal(preview.affected.length,1);
 const req={type:'people',slug:'ryuichi-sakamoto',hash:preview.hash,confirm:'ryuichi-sakamoto'};
 assert.equal((await post('/api/record-withdraw',{...req,confirm:'wrong'})).status,422);
 assert.equal((await post('/api/record-withdraw',req)).status,200);
 assert.deepEqual((await get('/api/record?type=exhibitions&slug=event')).fields.artists,[]);
 assert.equal((await post('/api/publish',person)).status,409);
 assert.equal((await post('/api/record-restore',req)).status,200);
 assert.deepEqual((await get('/api/record?type=exhibitions&slug=event')).fields.artists,['ryuichi-sakamoto']);
 assert.equal((await post('/api/record-delete',req)).status,200);
 assert.equal((await get('/api/records?type=people')).items.length,0);
 assert.equal((await get('/api/records?type=exhibitions')).items.length,1);
 }finally{await app?.close();await fs.rm(root,{recursive:true,force:true});}
});
