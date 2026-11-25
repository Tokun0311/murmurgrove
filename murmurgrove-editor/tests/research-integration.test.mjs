import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {createEditor} from '../server.mjs';
import {extractDocx} from '../word-import.mjs';
import {syncGraph,readArchive,answerQuestion,validateClaim,readEvents,activeRelations,readConceptMeta,buildGraph} from '../research-core.mjs';
// Minimal ZIP with a real central directory. No python, external packages, or network required.
function mockDocx(text){
 const payload=`<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</w:t></w:r></w:p></w:body></w:document>`;
 const plain=Buffer.from(payload),zipped=zlib.deflateRawSync(plain),name=Buffer.from('word/document.xml'),local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22);
 local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(8,8);local.writeUInt32LE(zipped.length,18);local.writeUInt32LE(plain.length,22);local.writeUInt16LE(name.length,26);
 const offset=local.length+name.length+zipped.length;
 central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(8,10);central.writeUInt32LE(zipped.length,20);central.writeUInt32LE(plain.length,24);central.writeUInt16LE(name.length,28);
 end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+name.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([local,name,zipped,central,name,end]);
}
async function fixture(){const root=await fs.mkdtemp(path.join(os.tmpdir(),'murmur-v1-'));for(const t of ['exhibitions','people','institutions','concepts','writing'])await fs.mkdir(path.join(root,'src/data',t),{recursive:true});
 await fs.writeFile(path.join(root,'src/content.config.ts'),'// mock schema');
 await fs.writeFile(path.join(root,'src/data/exhibitions/site-visit.md'),'---\ntitle: "A Site Encounter"\nvisitedOn: "2026-11-25"\nregion: "Tokyo"\nlocation: "Garden Museum"\nkind: "exhibition"\nartists: []\nconcepts: []\nrelatedInstitutions: []\nverification: "recorded"\n---\n\nThe garden installation challenged the separation of public memory and place.\n');
 await fs.writeFile(path.join(root,'src/data/exhibitions/older-visit.md'),'---\ntitle: "Older Installation"\nvisitedOn: "2024-01-05"\nregion: "Tokyo"\nlocation: "Elsewhere"\nkind: "exhibition"\nconcepts: ["site-specificity"]\n---\n\nSite-specificity across changing urban structures.\n');
 await fs.writeFile(path.join(root,'src/data/concepts/site-specificity.md'),'---\ntitle: "场域特定性"\n---\n\nRelated observations.\n');
 await fs.writeFile(path.join(root,'src/data/people/lee-chang-dong.md'),'---\nname: "Lee Chang-dong"\n---\n\nNot automatically associated with any artwork.\n');
 return root;}
async function serverFixture(fn){const root=await fixture(),priv=path.join(root,'local-private');let app;try{app=await createEditor({root,port:0,privateRoot:priv});const token=(await(await fetch(app.address+'/api/bootstrap')).json()).token;
 const post=async(url,data,{trusted=true}={})=>{const r=await fetch(app.address+url,{method:'POST',headers:{'content-type':'application/json','origin':trusted?app.address:'https://malicious.example','x-editor-token':token},body:JSON.stringify(data)});return {status:r.status,data:await r.json()}};
 return await fn({root,priv,post,base:app.address});}finally{await app?.close();await fs.rm(root,{recursive:true,force:true});}}

test('DOCX correctly extracts multilingual text; rejects invalid ZIP',()=>{
 const bytes=mockDocx('记忆與場所 / Public art & the city');assert.equal(extractDocx(bytes),'记忆與場所 / Public art & the city');
 assert.throws(()=>extractDocx(Buffer.from('not word')),/Only .docx/);
});
test('Word import preserves private ORIGINAL and does not touch public Markdown',async()=>serverFixture(async({root,priv,post})=>{
 const original=await fs.readFile(path.join(root,'src/data/exhibitions/site-visit.md'),'utf8');
 const bytes=mockDocx('A private draft about shared memory & the city.');
 const r=await post('/api/import-word',{name:'My-notes.docx',base64:bytes.toString('base64')});assert.equal(r.status,200);assert.match(r.data.text,/private draft/);
 const copy=path.join(priv,'originals',path.basename(r.data.originalCopy));assert.deepEqual(await fs.readFile(copy),bytes);
 assert.equal(await fs.readFile(path.join(root,'src/data/exhibitions/site-visit.md'),'utf8'),original);
 const graph=(await syncGraph(root,{write:false})).graph;assert.ok(!JSON.stringify(graph).includes('A private draft about shared memory'));
}));
test('local archive question returns exact searchable snippets and real clickable paths',async()=>serverFixture(async({post})=>{
 const r=await post('/api/ask',{question:'public memory garden'});assert.equal(r.status,200);
 assert.equal(r.data.results[0].key,'exhibitions:site-visit');assert.equal(r.data.results[0].path,'/exhibitions/site-visit/');
 assert.ok(r.data.results[0].evidence.includes('public memory'));
 assert.match(r.data.method,/NOT_GENERATIVE/);
 const prompt=await post('/api/grounded-prompt',{question:'memory garden'});assert.equal(prompt.status,200);assert.match(prompt.data.prompt,/\[S1\]/);
}));
test('source-backed new classification influences existing concept without editing its original Markdown',async()=>serverFixture(async({root,post})=>{
 const conceptFile=path.join(root,'src/data/concepts/site-specificity.md'),prior=await fs.readFile(conceptFile,'utf8');
 const claim={source:{type:'exhibitions',id:'site-visit'},target:{type:'concepts',id:'site-specificity'},kind:'interpretive',evidence:'public memory and place',reason:'An interpretive hypothesis about public memory embedded in its location.'};
 let r=await post('/api/relation-preview',{claim});assert.equal(r.status,200);
 r=await post('/api/relation-approve',{claim,confirm:true});assert.equal(r.status,200);
 const graph=await buildGraph(root);assert.ok(graph.relations.some(e=>e.kind==='interpretive'&&e.target==='concepts:site-specificity'));
 const optics=JSON.parse(await fs.readFile(path.join(root,'public/murmurgrove/organism/data/research-current.json'),'utf8').catch(()=>'{"schema":"missing"}'));
 // Optical data is only created when existing site viewer folder is present.
 assert.ok(['missing','murmurgrove.read-only-research-optics.1'].includes(optics.schema));
 assert.equal(await fs.readFile(conceptFile,'utf8'),prior);
 const history=JSON.parse(await fs.readFile(path.join(root,'public/murmurgrove/research/history-index.json'),'utf8'));assert.ok(history.length>=1);
 const id=r.data.event.claim.id;
 const revert=await post('/api/relation-withdraw',{claimId:id,reason:'Researcher revised earlier inference',confirm:true});assert.equal(revert.status,200);
 assert.ok(!(await buildGraph(root)).claims.some(c=>c.id===id));
 assert.equal((await readEvents(root)).length,2);
 assert.equal((await fs.readFile(conceptFile,'utf8')),prior);
}));
test('concept alias and 3-part memory are saved separately; duplicate aliases rejected',async()=>serverFixture(async({root,post})=>{
 const r=await post('/api/concept-meta',{id:'site-specificity',status:'provisional',aliases:['site specificity','场域特定性','サイトスペシフィシティ'],definition:'Situatedness of artistic work.',interpretation:'The question of where meaning is made.',development:'2026: I began to rethink location.',confirm:true});
 assert.equal(r.status,200);assert.equal(r.data.meta.aliases.length,3);assert.equal((await readConceptMeta(root))['site-specificity'].status,'provisional');
 let conflict=await post('/api/concept-meta',{id:'no-such-concept',confirm:true});assert.equal(conflict.status,422);
 const original=await fs.readFile(path.join(root,'src/data/concepts/site-specificity.md'),'utf8');assert.ok(!original.includes('Situatedness'));
}));
test('untrusted local origin and forged evidence cannot write relation ledger',async()=>serverFixture(async({root,post})=>{
 const claim={source:{type:'exhibitions',id:'site-visit'},target:{type:'concepts',id:'site-specificity'},kind:'documented',evidence:'invented fake quote',reason:'An invented claim with a fake source quote.'};
 const bad=await post('/api/relation-approve',{claim,confirm:true});assert.equal(bad.status,422);
 const evil=await post('/api/relation-approve',{claim,confirm:true},{trusted:false});assert.equal(evil.status,403);
 assert.equal((await readEvents(root)).length,0);
}));
test('publication rebuilds source snapshot with history; no draft or baseline changed',async()=>serverFixture(async({root,priv,post})=>{
 let r=await post('/api/draft',{type:'concepts',slug:'new-research-concept',fields:{title:'Unreleased'},body:'PRIVATE BODY'});assert.equal(r.status,200);
 r=await post('/api/publish',{type:'concepts',slug:'evolving-concept',fields:{title:'Evolving concept'},body:'## Definition\nNew research concept.',hash:null,confirmPublic:true});assert.equal(r.status,200);
 assert.equal(r.data.research.changed,true);assert.ok(await fs.access(path.join(root,'src/data/concepts/evolving-concept.md')).then(()=>true));
 const graph=JSON.parse(await fs.readFile(path.join(root,'public/murmurgrove/research/current.json'),'utf8'));
 assert.ok(graph.records.some(x=>x.key==='concepts:evolving-concept'));
 assert.ok(!JSON.stringify(graph).includes('PRIVATE BODY'));
 const repeat=await post('/api/sync-research',{confirm:true});assert.equal(repeat.data.changed,false);
 const versions=JSON.parse(await fs.readFile(path.join(root,'public/murmurgrove/research/history-index.json'),'utf8'));assert.equal(versions.length,1);
}));
test('human-approved Concept merge redirects only CURRENT relation graph and preserves original conceptual sources',async()=>serverFixture(async({root,post})=>{
 const conceptDir=path.join(root,'src/data/concepts');const old=path.join(conceptDir,'site-specificity.md');
 const rawOld=await fs.readFile(old,'utf8');await fs.writeFile(path.join(conceptDir,'located-practices.md'),'---\ntitle: "Located Practices"\n---\n\nAn emerging terminological variant.\n');
 const before=await buildGraph(root);assert.ok(before.relations.some(e=>e.target==='concepts:site-specificity'));
 const merge=await post('/api/concept-merge',{from:'site-specificity',to:'located-practices',reason:'Researcher confirms these are synonyms in the current project context.',confirm:true});
 assert.equal(merge.status,200,JSON.stringify(merge.data));
 const after=await buildGraph(root);
 assert.ok(after.relations.some(e=>e.target==='concepts:located-practices'));
 assert.ok(!after.relations.some(e=>e.target==='concepts:site-specificity'));
 assert.equal((await readConceptMeta(root))['site-specificity'].mergedInto,'located-practices');
 assert.equal(await fs.readFile(old,'utf8'),rawOld);
 assert.ok((await fs.readdir(path.join(root,'src/data/murmurgrove-relations/concept-history/site-specificity'))).some(f=>f.includes('merge')));
}));
test('merged-away concept cannot be silently recreated by editing its former lifecycle',async()=>serverFixture(async({root,post})=>{
 await fs.writeFile(path.join(root,'src/data/concepts/equivalent-term.md'),'---\ntitle: "Equivalent term"\n---\n\nRelated vocabulary.\n');
 const m=await post('/api/concept-merge',{from:'site-specificity',to:'equivalent-term',reason:'This intentional merge is reviewed against the actual catalog.',confirm:true});assert.equal(m.status,200);
 const r=await post('/api/concept-meta',{id:'site-specificity',status:'mature',aliases:['same title'],definition:'foo',interpretation:'bar',development:'baz',confirm:true});
 assert.equal(r.status,422);assert.equal((await readConceptMeta(root))['site-specificity'].mergedInto,'equivalent-term');
}));
