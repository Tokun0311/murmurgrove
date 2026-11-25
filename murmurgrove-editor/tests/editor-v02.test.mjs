import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createEditor} from '../server.mjs';
const md=(front,body='')=>`---\n${front}\n---\n\n${body}\n`;
test('v0.2 analysis routes use existing files, reject untrusted access, cannot mutate archive',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'murmurgrove-v02-'));
 let editor;
 try{
  for(const t of ['exhibitions','people','institutions','concepts','writing'])await fs.mkdir(path.join(root,'src','data',t),{recursive:true});
  await fs.writeFile(path.join(root,'src','content.config.ts'),'// keep original');
  await fs.writeFile(path.join(root,'src/data/people/carsten-nicolai.md'),md('name: Carsten Nicolai\nkind: artist'));
  await fs.writeFile(path.join(root,'src/data/institutions/hosoo-gallery.md'),md('name: HOSOO GALLERY'));
  await fs.writeFile(path.join(root,'src/data/concepts/site-specificity.md'),md('title: 场域特定性'));
  await fs.writeFile(path.join(root,'src/data/exhibitions/old-show.md'),md('title: Earlier work\nvisitedOn: 2026-11-01\nartists: [carsten-nicolai]'));
  const ref=await fs.readFile(path.join(root,'src/data/exhibitions/old-show.md'),'utf8');
  editor=await createEditor({root,port:0,openBrowser:false,privateRoot:path.join(root,'.private')});
  const host=editor.address;const bootstrap=await(await fetch(host+'/api/bootstrap')).json();
  const payload={type:'exhibitions',title:'Carsten Nicolai',location:'HOSOO GALLERY',body:'A site-specific sound work by Carsten Nicolai in Kyoto.',fields:{artists:[],concepts:[],relatedInstitutions:[]}};
  async function request(route, body, headers={}){const response=await fetch(host+route,{method:'POST',headers:{'content-type':'application/json','origin':host,'x-editor-token':bootstrap.token,...headers},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};}
  let a=await request('/api/analyze',payload);assert.equal(a.status,200);assert.equal(a.data.groups.people[0].id,'carsten-nicolai');assert.equal(a.data.groups.institutions[0].id,'hosoo-gallery');assert.equal(a.data.groups.concepts[0].id,'site-specificity');
  a=await request('/api/analyze',payload,{origin:'https://remote.site'});assert.equal(a.status,403);
  a=await request('/api/analyze',{...payload,type:'concepts'});assert.equal(a.status,422);
  a=await request('/api/ai-prompt',payload);assert.equal(a.status,200);assert.match(a.data.prompt,/Carsten Nicolai/);
  a=await request('/api/ai-review',{...payload,ai:{suggestions:[{group:'concepts',id:'site-specificity',reason:'meaning',evidence:'site-specific'},{group:'people',id:'invented',evidence:'Carsten Nicolai'}]}});
  assert.equal(a.status,200);assert.equal(a.data.acceptedCandidates,1);assert.equal(a.data.discarded,1);
  assert.equal(await fs.readFile(path.join(root,'src/data/exhibitions/old-show.md'),'utf8'),ref);
  await assert.rejects(fs.access(path.join(root,'.private','drafts')));
 }finally{await editor?.close();await fs.rm(root,{recursive:true,force:true})}
});
