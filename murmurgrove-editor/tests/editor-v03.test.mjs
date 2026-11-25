import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createEditor} from '../server.mjs';
import {scanExplicitNewRecords, validateNewRecordProposals,validateAiSuggestions, buildAiPrompt} from '../analyzer.mjs';
const catalog={people:[{slug:'carsten-nicolai',title:'Carsten Nicolai',fields:{name:'Carsten Nicolai'}}],institutions:[{slug:'hosoo-gallery',title:'HOSOO GALLERY',fields:{name:'HOSOO GALLERY'}}],concepts:[{slug:'site-specificity',title:'场域特定性',fields:{title:'场域特定性'}},{slug:'memory-and-place',title:'记忆与场所',fields:{title:'记忆与场所'}}],exhibitions:[]};
const source={title:'Possible Love',location:'Saitama',body:'Watched the film with my friend.\nDirector: Lee Chang-dong\nConcept: interpersonal distance\n概念：场域特定性\nVenue: HOSOO GALLERY\nI thought about intimacy and personal boundaries.'};

test('local explicit person and new concept; existing institution/translated concept are NOT recreated',()=>{
 const r=scanExplicitNewRecords(source,catalog);
 assert.deepEqual(r.newRecords.map(x=>`${x.group}:${x.id}`),['people:lee-chang-dong','concepts:interpersonal-distance']);
 assert.equal(r.newRecords[0].evidence.quote,'Lee Chang-dong');
 assert.equal(r.newRecords[1].evidence.quote,'interpersonal distance');
 assert.ok(r.newRejected.some(x=>x.reason.includes('Already in the archive')));
});
test('new AI concept may be inferred with exact quote, never auto linked',()=>{
 const r=validateAiSuggestions({suggestions:[],newRecords:[
  {group:'concepts',name:'Relational intimacy',id:'relational-intimacy',evidence:'intimacy and personal boundaries',reason:'Interpretive hypothesis only'},
  {group:'people',name:'Invented Director',id:'invented-director',evidence:'Watched the film',reason:'AI hallucinates a director'},
  {group:'concepts',name:'场域特定性',id:'site-specificity-2',evidence:'intimacy and personal boundaries',reason:'Already exists'},
  {group:'institutions',name:'New Museum',id:'new-museum',evidence:'Wrong quote',reason:'Not supported'}
 ]},source,catalog);
 assert.equal(r.newAccepted,1);
 assert.equal(r.newDiscarded,3);
 assert.equal(r.newRecords[0].id,'relational-intimacy');
 assert.equal(r.groups.people.length,0);
 assert.match(buildAiPrompt(source,catalog),/newRecords/);
});
test('CJK concept slug proposed deterministically without fake romanization',()=>{
 const r=validateNewRecordProposals([{group:'concepts',name:'情感距离',evidence:'intimacy and personal boundaries',reason:'Conceptual inference'}],source,catalog);
 assert.equal(r.newAccepted,1);
 assert.match(r.newRecords[0].id,/^concept-[0-9a-f]{8}$/);
});
test('private candidate drafts cannot mutate public records; IDs and names are collision-protected',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'murmur-v03-test-'));const priv=path.join(root,'.private');let editor;
 try{
  for(const t of ['exhibitions','people','institutions','concepts','writing'])await fs.mkdir(path.join(root,'src/data',t),{recursive:true});
  await fs.writeFile(path.join(root,'src','content.config.ts'),'// immutable');
  await fs.writeFile(path.join(root,'src/data/concepts/site-specificity.md'),'---\ntitle: "场域特定性"\n---\n\n');
  const original=await fs.readFile(path.join(root,'src/data/concepts/site-specificity.md'),'utf8');
  editor=await createEditor({root,port:0,privateRoot:priv});const base=editor.address;
  const token=(await(await fetch(base+'/api/bootstrap')).json()).token;
  const post=async(route,obj,origin=base)=>{const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json','origin':origin,'x-editor-token':token},body:JSON.stringify(obj)});return{status:r.status,data:await r.json()};};
  const candidate={group:'people',name:'Lee Chang-dong',id:'lee-chang-dong',evidence:'Lee Chang-dong',reason:'Director label in notes; verify before linking'};
  let r=await post('/api/new-review',{source,candidate});assert.equal(r.status,200);assert.equal(r.data.candidate.id,'lee-chang-dong');
  r=await post('/api/candidate-draft',{source,candidate});assert.equal(r.status,201);assert.equal(r.data.kind,'private-proposed-record');
  assert.ok((await fs.readFile(path.join(priv,'drafts/people/lee-chang-dong.json'),'utf8')).includes('Pending manual review'));
  await assert.rejects(fs.access(path.join(root,'src/data/people/lee-chang-dong.md')));
  r=await post('/api/candidate-draft',{source,candidate});assert.equal(r.status,409);
  const collisionName={...candidate,id:'lee-c-d'};r=await post('/api/candidate-draft',{source,candidate:collisionName});assert.equal(r.status,409);
  const c={group:'concepts',name:'Relational intimacy',id:'relational-intimacy',evidence:'intimacy and personal boundaries',reason:'Speculative concept link'};
  r=await post('/api/candidate-draft',{source,candidate:c});assert.equal(r.status,201);
  await assert.rejects(fs.access(path.join(root,'src/data/concepts/relational-intimacy.md')));
  r=await post('/api/candidate-draft',{source,candidate:{...c,id:'site-specificity'}});assert.equal(r.status,422);
  r=await post('/api/candidate-draft',{source,candidate:c},'https://evil.example');assert.equal(r.status,403);
  const badEvidence={...candidate,id:'fake-lee',evidence:'random invented quote'};
  r=await post('/api/candidate-draft',{source,candidate:badEvidence});assert.equal(r.status,422);
  r=await post('/api/candidate-draft',{source,candidate:{...candidate,id:'../../evil'}});assert.equal(r.status,422);
  r=await post('/api/ai-review',{type:'exhibitions',...source,ai:{suggestions:[],newRecords:[c]}});assert.equal(r.status,200);assert.equal(r.data.newAccepted,1);
  assert.equal(await fs.readFile(path.join(root,'src/data/concepts/site-specificity.md'),'utf8'),original);
 }finally{await editor?.close();await fs.rm(root,{recursive:true,force:true})}
});
