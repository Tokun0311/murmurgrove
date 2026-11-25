import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createEditor } from '../server.mjs';

function md(yaml,body='Example body'){return '---\n'+yaml+'\n---\n\n'+body+'\n'}

test('uses actual Astro collection format; drafts never publish; references validated; originals preserved',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'murmurgrove-test-'));
  let app;
  try{
    for(const t of ['exhibitions','people','institutions','concepts','writing'])await fs.mkdir(path.join(root,'src','data',t),{recursive:true});
    await fs.writeFile(path.join(root,'src','content.config.ts'),'// existing Astro schemas');
    await fs.writeFile(path.join(root,'src/data/people/carsten-nicolai.md'),md('name: Carsten Nicolai\nkind: artist'));
    await fs.writeFile(path.join(root,'src/data/institutions/hosoo-gallery.md'),md('name: HOSOO GALLERY\ncity: Kyoto'));
    await fs.writeFile(path.join(root,'src/data/concepts/sound-and-technology.md'),md('title: Sound and technology'));
    const original=md('title: "Carsten Nicolai: WAVE WEAVE"\nvisitedOn: \'2026-01-07\'\ndateLabel: 01-07\nregion: Kyoto\nlocation: HOSOO GALLERY\nkind: exhibition\nartists:\n- carsten-nicolai\nconcepts:\n- sound-and-technology\nverification: recorded\ninstitution: hosoo-gallery\neditorialReview: keep-this-unknown-field', '## Observed\n\nOriginal observation text.');
    await fs.writeFile(path.join(root,'src/data/exhibitions/2026-01-07-02.md'),original);
    app=await createEditor({root,port:0,openBrowser:false,privateRoot:path.join(root,'.private')});const base=app.address;
    async function get(url){const r=await fetch(base+url);return{status:r.status,...await r.json()}}
    const bootstrap=await get('/api/bootstrap');assert.ok(bootstrap.token);
    async function post(route,data,{origin=base,token=bootstrap.token}={}){const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json',origin,'x-editor-token':token},body:JSON.stringify(data)});return{status:r.status,...await r.json()}}
    const listed=await get('/api/records?type=exhibitions');assert.equal(listed.items.length,1);assert.equal(listed.items[0].fields.artists[0],'carsten-nicolai');
    const read=await get('/api/record?type=exhibitions&slug=2026-01-07-02');assert.equal(read.fields.title,'Carsten Nicolai: WAVE WEAVE');assert.match(read.body,/Original observation/);
    const draft={type:'exhibitions',slug:'2026-11-25-new-exhibition',fields:{title:'New exhibition',visitedOn:'2026-11-25',region:'Tokyo',location:'A museum',kind:'exhibition',artists:['carsten-nicolai'],concepts:['sound-and-technology'],institution:'hosoo-gallery'},body:'New note',hash:null};
    let res=await post('/api/draft',draft);assert.equal(res.status,200);await assert.rejects(fs.access(path.join(root,'src/data/exhibitions',draft.slug+'.md')));
    const drafts=await get('/api/drafts?type=exhibitions');assert.ok(drafts.items.some(x=>x.slug===draft.slug));
    res=await post('/api/publish',{...draft,confirmPublic:true},{origin:'https://evil.example'});assert.equal(res.status,403);
    res=await post('/api/publish',{...draft,confirmPublic:true,fields:{...draft.fields,artists:['invented-person']}});assert.equal(res.status,422);
    res=await post('/api/publish',{...draft,confirmPublic:false});assert.equal(res.status,422);
    res=await post('/api/publish',{...draft,confirmPublic:true});assert.equal(res.status,200);const next=await fs.readFile(path.join(root,'src/data/exhibitions',draft.slug+'.md'),'utf8');assert.match(next,/artists: \["carsten-nicolai"\]/);assert.match(next,/dateLabel: "11-25"/);
    res=await post('/api/publish',{type:'exhibitions',slug:'2026-01-07-02',fields:{...read.fields,title:'Revised title'},body:read.body+'\nAdded.',hash:read.hash,confirmPublic:true});assert.equal(res.status,200);
    const revised=await fs.readFile(path.join(root,'src/data/exhibitions/2026-01-07-02.md'),'utf8');assert.match(revised,/editorialReview: keep-this-unknown-field/);assert.match(revised,/Original observation text/);assert.match(revised,/Revised title/);
    res=await post('/api/publish',{type:'exhibitions',slug:'2026-01-07-02',fields:{...read.fields,title:'Oops stale'},body:'',hash:read.hash,confirmPublic:true});assert.equal(res.status,409);
    res=await post('/api/draft',{...draft,slug:'../../injected'});assert.equal(res.status,400);
    assert.equal((await get('/api/records?type=exhibitions')).items.length,2);
  }finally{await app?.close();await fs.rm(root,{recursive:true,force:true});}
});
