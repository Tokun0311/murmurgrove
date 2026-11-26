import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createEditor} from '../server.mjs';
test('private incomplete recovery remains separate from drafts, rejects untrusted writes, survives restart and deletes independently',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'atelier-v2-'));let app;
 try{
  for(const t of ['exhibitions','people','institutions','concepts','writing'])await fs.mkdir(path.join(root,'src/data',t),{recursive:true});
  await fs.writeFile(path.join(root,'src/content.config.ts'),'// test schema');
  const priv=path.join(root,'.private');const start=()=>createEditor({root,port:0,privateRoot:priv});app=await start();
  let token=(await (await fetch(app.address+'/api/bootstrap')).json()).token;
  const get=async p=>{const r=await fetch(app.address+p);return {status:r.status,...await r.json()};};
  const post=async(p,data,origin=app.address)=>{const r=await fetch(app.address+p,{method:'POST',headers:{'Content-Type':'application/json','Origin':origin,'X-Editor-Token':token},body:JSON.stringify(data)});return {status:r.status,...await r.json()};};
  const draft={type:'people',slug:'test-person',fields:{name:'Original draft'},body:'draft text',hash:null};
  assert.equal((await post('/api/draft',draft)).status,200);
  const id=randomUUID(),data={...draft,mode:'draft',body:'unsaved revision',fields:{name:''}};
  assert.equal((await post('/api/recovery-save',{id,data},'https://example.com')).status,403);
  assert.equal((await post('/api/recovery-save',{id:'../bad',data})).status,400);
  assert.equal((await post('/api/recovery-save',{id,data})).status,200);
  assert.equal((await get('/api/draft?type=people&slug=test-person')).body,'draft text');
  assert.equal((await get('/api/recovery?id='+id)).data.body,'unsaved revision');
  assert.equal((await get('/api/records?type=people')).items.length,0);
  await app.close();app=await start();token=(await get('/api/bootstrap')).token;
  assert.equal((await get('/api/recoveries')).items[0].id,id);
  assert.equal((await get('/api/recovery?id='+id)).data.body,'unsaved revision');
  assert.equal((await post('/api/recovery-delete',{id})).status,200);
  assert.equal((await get('/api/recoveries')).items.length,0);
  assert.equal((await get('/api/draft?type=people&slug=test-person')).body,'draft text');
 }finally{await app?.close();await fs.rm(root,{recursive:true,force:true});}
});
