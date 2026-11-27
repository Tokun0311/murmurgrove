import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createEditor} from '../server.mjs';
import {reachableBundle,externalBundleRefs} from '../assets/bundle-links.mjs';

const node=(type,slug,name,fields={})=>({type,slug,name,body:'',reviewed:true,...fields});
const event=(bundle,extra={})=>({type:'exhibitions',slug:'event',fields:{title:'Event',visitedOn:'2026-11-27',region:'Tokyo',location:'Venue',kind:'exhibition',artists:['participant']},body:'Original exhibition note',bundle,confirmPublic:true,...extra});
async function fixture(fn){const root=await fs.mkdtemp(path.join(os.tmpdir(),'mg-nested-'));let app;try{
 for(const type of ['exhibitions','people','institutions','concepts','writing'])await fs.mkdir(path.join(root,'src/data',type),{recursive:true});
 await fs.writeFile(path.join(root,'src/content.config.ts'),'// fixture');
 const priv=path.join(root,'.private');app=await createEditor({root,port:0,privateRoot:priv});const base=app.address;
 const get=async(route)=>{const r=await fetch(base+route);return {status:r.status,data:await r.json()}};
 const token=(await get('/api/bootstrap')).data.token;
 const post=async(route,p,origin=base)=>{const r=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json',origin,'x-editor-token':token},body:JSON.stringify(p)});return {status:r.status,data:await r.json()}};
 const record=(type,slug)=>get('/api/record?'+new URLSearchParams({type,slug}));
 const draftFile=(type,slug)=>path.join(priv,'drafts',type,slug+'.json');
 await fn({root,priv,get,post,record,draftFile});
 }finally{await app?.close();await fs.rm(root,{recursive:true,force:true});}}

test('reachable links traverse nested nodes, but do not add a direct exhibition relation or admit disconnected cycles',()=>{
 const ns=[node('people','participant','Participant',{linkedConcepts:['term']}),node('concepts','term','Term',{linkedInstitutions:['space']}),node('institutions','space','Space',{linkedPeople:['participant']}),node('concepts','orphan','Orphan',{linkedPeople:['other']}),node('people','other','Other',{linkedConcepts:['orphan']})];
 const fields={artists:['participant'],institution:'existing-venue'};
 assert.deepEqual([...reachableBundle('exhibitions',fields,ns)].sort(),['concepts:term','institutions:existing-venue','institutions:space','people:participant']);
 assert.deepEqual(externalBundleRefs('exhibitions','event',fields,ns).map(x=>[x.type,x.slug]),[['institutions','existing-venue']]);
 assert.equal(fields.concepts,undefined);
});

test('recover nested private drafts without retyping, require fresh review, preserve originals and precise relation types',()=>fixture(async({root,post,get,record,draftFile})=>{
 const text='Unedited private source';const capture=await post('/api/capture-original',{text,title:'Source'});assert.equal(capture.status,200);const sourceSha=capture.data.sha256;
 const concept={type:'concepts',slug:'archival-practices',fields:{title:'Archival Practices',alternativeNames:['档案实践','アーカイブ実践'],linkedInstitutions:['gallery'],sources:['Book, p. 10']},body:'Definition typed by the editor.',originalTextSha:sourceSha};
 const gallery={type:'institutions',slug:'gallery',fields:{name:'Gallery',nativeName:'美術館',city:'Tokyo',longitude:139.7,latitude:35.6,address:'Existing address',linkedPeople:['participant']},body:'Existing institution description.'};
 for(const d of [concept,gallery,{type:'concepts',slug:'unrelated',fields:{title:'Unrelated'},body:'Must stay private'}])assert.equal((await post('/api/draft',d)).status,200);
 const original=await fs.readFile(draftFile('concepts','archival-practices'));const originalGallery=await fs.readFile(draftFile('institutions','gallery'));
 const participant=node('people','participant','Participant',{linkedConcepts:['archival-practices']});
 const inspect=await post('/api/bundle-inspect',{refs:[{type:'concepts',slug:'archival-practices'},{type:'concepts',slug:'missing'}]});assert.equal(inspect.status,200);assert.equal(inspect.data.items[1].status,'missing');const recovered=inspect.data.items[0].candidate;assert.equal(recovered.reviewed,false);assert.equal(recovered.body,concept.body);assert.deepEqual(recovered.profile.alternativeNames,concept.fields.alternativeNames);
 assert.equal((await post('/api/bundle-inspect',{refs:[]},'https://example.com')).status,403);
 const recoveredGallery=(await post('/api/bundle-inspect',{refs:[{type:'institutions',slug:'gallery'}]})).data.items[0].candidate;
 let data=event([participant,recovered,recoveredGallery]);
 assert.equal((await post('/api/draft',data)).status,200);const reopened=(await get('/api/draft?type=exhibitions&slug=event')).data;assert.equal(reopened.bundle[1].sourceDraftHash,recovered.sourceDraftHash);assert.equal(reopened.bundle[1].reviewed,false);
 assert.match((await post('/api/bundle-publish',data)).data.error,/Review this new record/);assert.equal((await record('people','participant')).status,404);
 data.bundle.forEach(n=>n.reviewed=true);
 assert.match((await post('/api/bundle-publish',{...data,bundle:[participant,recovered]})).data.error,/Missing linked archive record: institutions\/gallery/);
 assert.equal((await record('concepts','archival-practices')).status,404);
 const orphan=node('concepts','orphan','Orphan',{linkedPeople:['orphan-person']});const orphanPerson=node('people','orphan-person','Orphan person',{linkedConcepts:['orphan']});
 assert.match((await post('/api/bundle-publish',{...data,bundle:[...data.bundle,orphan,orphanPerson]})).data.error,/Unlinked candidate/);
 const result=await post('/api/bundle-publish',data);assert.equal(result.status,200,JSON.stringify(result));
 const c=(await record('concepts','archival-practices')).data;assert.equal(c.body.trim(),concept.body);assert.deepEqual(c.fields.alternativeNames,concept.fields.alternativeNames);assert.equal(c.originalTextSha,sourceSha);assert.deepEqual(c.fields.linkedInstitutions,['gallery']);assert.deepEqual((await record('exhibitions','event')).data.fields.concepts,[]);assert.deepEqual((await record('people','participant')).data.fields.linkedConcepts,['archival-practices']);
 const g=(await record('institutions','gallery')).data;assert.equal(Number(g.fields.longitude),139.7);assert.equal(g.fields.address,'Existing address');assert.equal(g.body.trim(),gallery.body);
 assert.deepEqual(await fs.readFile(draftFile('concepts','archival-practices')),original);assert.deepEqual(await fs.readFile(draftFile('institutions','gallery')),originalGallery);assert.equal((await record('concepts','unrelated')).status,404);
}));

test('a changed linked draft cannot be silently replaced; standalone profile bundles use the same atomic workflow',()=>fixture(async({post,get,record})=>{
 const draft={type:'concepts',slug:'term',fields:{title:'Term'},body:'Original term'};assert.equal((await post('/api/draft',draft)).status,200);
 const candidate=(await post('/api/bundle-inspect',{refs:[{type:'concepts',slug:'term'}]})).data.items[0].candidate;candidate.reviewed=true;
 const person={type:'people',slug:'person',fields:{name:'Person',linkedConcepts:['term']},body:'Profile',bundle:[candidate],confirmPublic:true};
 assert.equal((await post('/api/draft',person)).status,200);assert.equal((await get('/api/draft?type=people&slug=person')).data.bundle.length,1);
 assert.equal((await post('/api/draft',{...draft,body:'New version'})).status,200);
 const stale=await post('/api/bundle-publish',person);assert.equal(stale.status,409);assert.match(stale.data.error,/Linked private draft changed/);assert.equal((await record('people','person')).status,404);assert.equal((await record('concepts','term')).status,404);
 const fresh=(await post('/api/bundle-inspect',{refs:[{type:'concepts',slug:'term'}]})).data.items[0].candidate;fresh.reviewed=true;
 const result=await post('/api/bundle-publish',{...person,bundle:[fresh]});assert.equal(result.status,200,JSON.stringify(result));assert.equal((await record('concepts','term')).data.body.trim(),'New version');assert.deepEqual((await record('people','person')).data.fields.linkedConcepts,['term']);
}));
