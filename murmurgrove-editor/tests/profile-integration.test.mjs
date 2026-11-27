import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createEditor} from '../server.mjs';
import {buildGraph,mdParts} from '../research-core.mjs';
import {metadataSuggestions} from '../profile-metadata.mjs';
import {readCurrentResearch,edgeKey} from '../../public/murmurgrove/organism/research-current-overlay.mjs';
const md=(yaml,body='Independent note.')=>`---\n${yaml}\n---\n\n${body}\n`;
test('only explicit metadata is extracted, existing values and ambiguous statements remain untouched',()=>{
 const text='- **原文姓名：** 坂本龍一\n- 生卒年份：1952–2023\n- 出生地：Tokyo, Japan\n- 主要领域：Sound Art、Composition\n- 官方网站：https://example.org/\n- 相关机构：YCAM';
 assert.deepEqual(metadataSuggestions('people',{website:'https://other.example/'},text),{nativeName:'坂本龍一',birthplace:'Tokyo, Japan',practiceFields:['Sound Art','Composition'],birthYear:'1952',deathYear:'2023'});
 assert.deepEqual(metadataSuggestions('institutions',{},'成立时间：1946年（部分资料为1947年）\n官方网站：https://one.example/\nWebsite: https://two.example/'),{});
 assert.deepEqual(metadataSuggestions('people',{name:'Kataoka Mami / 片岡真実'},''),{nativeName:'片岡真実'});
});
test('five collection profiles, curator-only grouped publication, reciprocal connections, overlay, and cleanup',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mg-profile-'));let app;
 try{
  for(const t of ['people','institutions','exhibitions','concepts','writing'])await fs.mkdir(path.join(root,'src/data',t),{recursive:true});
  await fs.writeFile(path.join(root,'src/content.config.ts'),'// fixture');
  await fs.writeFile(path.join(root,'src/data/concepts/sound.md'),md('title: Sound'));
  await fs.writeFile(path.join(root,'src/data/institutions/museum.md'),md('name: Museum'));
  await fs.writeFile(path.join(root,'src/data/writing/note.md'),md('title: Note\ndate: 2026-11-27\ndescription: Research\ndraft: false'));
  app=await createEditor({root,port:0,privateRoot:path.join(root,'.private')});const base=app.address;
  const get=async route=>(await fetch(base+route)).json();const token=(await get('/api/bootstrap')).token;
  const post=async(route,p)=>{const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json',origin:base,'x-editor-token':token},body:JSON.stringify(p)});return {status:r.status,data:await r.json()}};
  const person={type:'people',slug:'person',fields:{name:'Example',nativeName:'坂本龍一',birthYear:'1952',deathYear:'2023',birthplace:'Tokyo, Japan',practiceFields:['Sound Art'],roles:['Composer'],website:'https://example.org/',sources:['https://example.org/','Book, p. 12'],linkedInstitutions:['museum'],linkedConcepts:['sound'],linkedWriting:['note']},body:'Original text.',confirmPublic:true};
  assert.equal((await post('/api/publish',{...person,fields:{...person.fields,deathYear:'1900'}})).status,422);
  assert.equal((await post('/api/publish',{...person,fields:{...person.fields,website:'javascript:alert(1)'}})).status,422);
  assert.equal((await post('/api/publish',person)).status,200);
  const saved=await get('/api/record?type=people&slug=person');assert.equal(String(saved.fields.birthYear),'1952');assert.deepEqual(saved.fields.practiceFields,['Sound Art']);assert.deepEqual(saved.fields.sources,person.fields.sources);
  const ex={type:'exhibitions',slug:'event',fields:{title:'Exhibition',visitedOn:'2026-11-27',region:'Tokyo',location:'Museum',kind:'exhibition',curators:['new-curator']},body:'Exhibition note.',bundle:[{type:'people',slug:'new-curator',name:'New Curator',kind:'curator',body:'',linkedConcepts:['sound'],reviewed:true}],confirmPublic:true};
  assert.equal((await post('/api/bundle-publish',ex)).status,200);
  const event=await get('/api/record?type=exhibitions&slug=event');assert.deepEqual(event.fields.curators,['new-curator']);assert.deepEqual(event.fields.artists,[]);
  const concept=await get('/api/record?type=concepts&slug=sound');
  assert.equal((await post('/api/publish',{type:'concepts',slug:'sound',hash:concept.hash,fields:{...concept.fields,nativeName:'声音',linkedPeople:['person'],linkedExhibitions:['event']},body:concept.body,confirmPublic:true})).status,200);
  const graph=await buildGraph(root);const layer=readCurrentResearch(graph);
  for(const [a,b] of [['person:person','institution:museum'],['person:person','concept:sound'],['person:person','writing:note'],['person:new-curator','exhibition:event'],['concept:sound','exhibition:event']])assert.ok(layer.pairKeys.has(edgeKey(a,b)),a+' '+b);
  assert.equal(graph.relations.filter(r=>[r.source,r.target].includes('people:person')&&[r.source,r.target].includes('concepts:sound')).length,1);
  const preview=await get('/api/record-removal-preview?type=people&slug=new-curator');assert.equal(preview.affected.length,1);
  assert.equal((await post('/api/record-delete',{type:'people',slug:'new-curator',hash:preview.hash,confirm:'new-curator'})).status,200);
  assert.deepEqual((await get('/api/record?type=exhibitions&slug=event')).fields.curators,[]);
 }finally{await app?.close();await fs.rm(root,{recursive:true,force:true});}
});
test('migration preserves every original body and existing field; second run is idempotent',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mg-migrate-'));try{
 for(const t of ['people','institutions','exhibitions','concepts','writing'])await fs.mkdir(path.join(root,'src/data',t),{recursive:true});
 await fs.mkdir(path.join(root,'scripts'));await fs.mkdir(path.join(root,'murmurgrove-editor'));
 for(const f of ['research-core.mjs','profile-metadata.mjs'])await fs.copyFile(new URL('../'+f,import.meta.url),path.join(root,'murmurgrove-editor',f));
 await fs.copyFile(new URL('../../scripts/migrate-profile-metadata.mjs',import.meta.url),path.join(root,'scripts/migrate-profile-metadata.mjs'));
 const file=path.join(root,'src/data/people/person.md'),raw=md('name: Person\nreading: "ぺるそん"\nwebsite: "https://keep.example/"','- 生卒年份：1952–2023\n- 官方网站：https://ignore.example/\nUnchanged note.');await fs.writeFile(file,raw);
 const run=(...args)=>spawnSync(process.execPath,[path.join(root,'scripts/migrate-profile-metadata.mjs'),...args],{encoding:'utf8'});
 assert.equal(run().status,0);assert.equal(await fs.readFile(file,'utf8'),raw);const result=run('--apply');assert.equal(result.status,0,result.stderr);
 const next=await fs.readFile(file,'utf8');assert.equal(mdParts(next).body,mdParts(raw).body);assert.deepEqual(mdParts(next).fields,{...mdParts(raw).fields,birthYear:'1952',deathYear:'2023'});assert.match(run('--apply').stdout,/Applied: 0 records, 0 fields/);assert.equal(await fs.readFile(file,'utf8'),next);
 }finally{await fs.rm(root,{recursive:true,force:true})}
});
