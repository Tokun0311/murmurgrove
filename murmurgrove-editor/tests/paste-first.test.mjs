import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {createEditor} from '../server.mjs';

async function fixture(fn){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'murmur-paste-v11-'));
 const priv=path.join(root,'private-local');
 for(const type of ['exhibitions','people','institutions','concepts','writing'])await fs.mkdir(path.join(root,'src/data',type),{recursive:true});
 await fs.writeFile(path.join(root,'src/content.config.ts'),'// test schema');
 let app;
 try{
  app=await createEditor({root,port:0,privateRoot:priv});
  const token=(await(await fetch(app.address+'/api/bootstrap')).json()).token;
  const post=async(url,data,valid=true)=>{
   const resp=await fetch(app.address+url,{method:'POST',headers:{'content-type':'application/json','origin':valid?app.address:'https://elsewhere.example','x-editor-token':token},body:JSON.stringify(data)});
   return {status:resp.status,data:await resp.json()};
  };
  return await fn({root,priv,post,app});
 } finally {await app?.close();await fs.rm(root,{recursive:true,force:true});}
}

test('paste captures exact UTF-8 text privately, even without Word; no public records created',()=>fixture(async({root,priv,post})=>{
 const original='Original 中文 \r\n二行目 日本語\nEnglish: site-specificity.\n';
 const response=await post('/api/capture-original',{text:original,title:'A journal entry'});
 assert.equal(response.status,200);
 const h=crypto.createHash('sha256').update(original).digest('hex');
 assert.equal(response.data.sha256,h);
 assert.equal(await fs.readFile(path.join(priv,'originals',`text-${h}.txt`),'utf8'),original);
 const metadata=JSON.parse(await fs.readFile(path.join(priv,'originals',`text-${h}.json`),'utf8'));
 assert.equal(metadata.format,'text/plain; charset=utf-8');
 assert.equal((await fs.readdir(path.join(root,'src/data/writing'))).length,0);
 const repeat=await post('/api/capture-original',{text:original});assert.equal(repeat.status,200);
 assert.equal(repeat.data.sha256,h);
}));

test('draft stores reference to original; editing draft never mutates original; original survives public publication',()=>fixture(async({root,priv,post,app})=>{
 const text='Original independent notes about layered memory.\nSecond paragraph.';
 const original=await post('/api/capture-original',{text,title:'my original'});
 const hash=original.data.sha256;
 let result=await post('/api/draft',{type:'concepts',slug:'memory-time',fields:{title:'Memory and time'},body:'Edited interpretation and question.',originalTextSha:hash});
 assert.equal(result.status,200);
 const draft=JSON.parse(await fs.readFile(path.join(priv,'drafts/concepts/memory-time.json'),'utf8'));
 assert.equal(draft.originalTextSha,hash);
 assert.notEqual(draft.body,text);
 result=await post('/api/publish',{type:'concepts',slug:'memory-time',fields:{title:'Memory and time'},body:'Published review based on the original',originalTextSha:hash,confirmPublic:true});
 assert.equal(result.status,200);
 const publicMarkdown=await fs.readFile(path.join(root,'src/data/concepts/memory-time.md'),'utf8');
 assert.doesNotMatch(publicMarkdown,/Original independent notes/);
 assert.doesNotMatch(publicMarkdown,/originalTextSha/);
 const link=JSON.parse(await fs.readFile(path.join(priv,'source-links/concepts/memory-time.json'),'utf8'));
 assert.equal(link.originalTextSha,hash);
 const published=await(await fetch(app.address+'/api/record?type=concepts&slug=memory-time')).json();
 assert.equal(published.originalTextSha,hash);
 assert.equal(await fs.readFile(path.join(priv,'originals',`text-${hash}.txt`),'utf8'),text);
}));

test('source capture rejects empty, oversized and untrusted requests; does not accept fabricated snapshot references',()=>fixture(async({post})=>{
 assert.equal((await post('/api/capture-original',{text:'   '})).status,422);
 assert.equal((await post('/api/capture-original',{text:'x'.repeat(700001)})).status,422);
 assert.equal((await post('/api/capture-original',{text:'Private text'},false)).status,403);
 assert.equal((await post('/api/draft',{type:'concepts',slug:'fake',fields:{title:'Fake'},body:'Test',originalTextSha:'f'.repeat(64)})).status,422);
}));

test('paste-first UI uses existing editable body and preserves optional DOCX support',async()=>{
 const editorRoot=new URL('../',import.meta.url);
 const html=await fs.readFile(new URL('index.html',editorRoot),'utf8');
 const js=await fs.readFile(new URL('assets/research.js',editorRoot),'utf8');
 assert.match(html,/Research text \/ Paste here/);
 assert.match(html,/id="capture-original"/);
 assert.match(html,/Optional \/ Import a \.docx file instead/);
 assert.match(js,/'\/api\/capture-original'/);
});
