import assert from 'node:assert/strict';
import worker,{MurmurgroveState} from './worker.js';
const values=new Map();const ctx={storage:{get:async k=>values.get(k),put:async(k,v)=>values.set(k,structuredClone(v))}};
const env={ALLOWED_ORIGIN:'https://tow-archive.pages.dev',INGEST_SECRET:'test-only'};
const object=new MurmurgroveState(ctx,env);
let res=await object.fetch(new Request('https://internal/state'));
assert.equal((await res.json()).ready,false);
const marks=[
 {key:'a',section:'exhibitions',x:.25,y:.55},
 {key:'b',section:'institutions',x:.65,y:.45},
 {key:'c',section:'people',x:.55,y:.6}];
const roots=[{from:'exhibitions:a',to:'institutions:b',weight:1,kind:'direct'},
 {from:'exhibitions:a',to:'people:c',weight:1,kind:'direct'}];
const ingest=async version=>object.fetch(new Request('https://internal/ingest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version,marks,roots})}));
res=await ingest('v1');assert.equal((await res.json()).changed,true);
res=await object.fetch(new Request('https://internal/state'));let state=await res.json();
assert.equal(state.ready,true);assert.equal(state.organs.length,3);
assert.equal(state.version,'v1');
const start=state.organs.find(o=>o.id==='institutions:b').p;
const old=structuredClone(values.get('body'));old.updatedAt=Date.now()-1900;values.set('body',old);
res=await object.fetch(new Request('https://internal/state'));state=await res.json();
assert.ok(state.tick>0,'simulation progresses between requests');
const moved=state.organs.find(o=>o.id==='institutions:b').p;
assert.notDeepEqual(moved,start,'root forces move institutions');
res=await ingest('v1');assert.equal((await res.json()).changed,false);
marks.splice(0,1,{key:'d',section:'exhibitions',x:.24,y:.52});
res=await ingest('v2');assert.equal((await res.json()).changed,true);
res=await object.fetch(new Request('https://internal/state'));state=await res.json();
assert.equal(state.organs.some(o=>o.id==='exhibitions:a'),false,'deleted record leaves current body');
assert.equal(state.organs.some(o=>o.id==='exhibitions:d'),true,'new record joins current body');
assert.deepEqual(state.organs.find(o=>o.id==='institutions:b').p,moved,'existing organ continues position');
const binding={GROVE:{idFromName:()=>1,get:()=>({fetch:r=>object.fetch(r)})}};
res=await worker.fetch(new Request('https://worker.example/ingest',{method:'POST'}),{...env,...binding});
assert.equal(res.status,401);
console.log('Shared body: ingest, persisted movement, stable state, edit/delete and authentication passed.');
