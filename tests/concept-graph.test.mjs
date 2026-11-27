import test from 'node:test';import assert from 'node:assert/strict';
import {edgeKey,overviewEdges,mobileConceptLayout} from '../src/lib/concept-graph.mjs';
import {conceptLanguageTag,conceptNameVariants,setConceptLanguage} from '../murmurgrove-editor/assets/bundle-links.mjs';
import {conceptLabels} from '../src/lib/concept-labels.mjs';
test('overview prioritizes repeated shared encounters, degree bounded, no mutation',()=>{
 const edges=[{a:'a',b:'b',count:5},{a:'a',b:'c',count:4},{a:'a',b:'d',count:3},{a:'b',b:'c',count:2},{a:'d',b:'e',count:1}];const original=JSON.stringify(edges);
 const result=overviewEdges(edges,2,2);assert.deepEqual([...result],edges.slice(0,2).concat(edges[3]).map(edgeKey));assert.equal(JSON.stringify(edges),original);assert.equal(overviewEdges(edges,1,2).size,1);
});
test('overview remains sparse on a dense 150-node graph',()=>{const edges=[];for(let i=0;i<150;i++)for(let j=i+1;j<150;j++)edges.push({a:String(i),b:String(j),count:2+(i+j)%5});const selected=overviewEdges(edges);assert.ok(selected.size<=150);assert.equal(edges.length,11175);const degree={};for(const k of selected)for(const id of JSON.parse(k))degree[id]=(degree[id]||0)+1;assert.ok(Object.values(degree).every(n=>n<=2));});
test('mobile extends instead of stacking new concepts at bottom',()=>{const nodes=Array.from({length:101},(_,i)=>({id:'n'+i}));const layout=mobileConceptLayout(nodes,{n0:[52,90,10,10]});assert.equal(layout.height,1180+50*155);assert.equal(new Set(layout.nodes.map(n=>`${n.mx},${n.my}`)).size,101);assert.ok(layout.nodes.every(n=>n.my>0&&n.my<100));assert.equal(layout.nodes[0].my*layout.height/100,1062);});
test('language editor preserves aliases, accepts explicit Han-only Japanese, no schema change',()=>{let a=['旧别名','ja: 旧名称','en: Old name'];a=setConceptLanguage(a,'ja','制度研究');assert.deepEqual(a,['旧别名','en: Old name','ja: 制度研究']);assert.equal(conceptLabels({title:'新概念',alternativeNames:a}).ja,'制度研究');assert.deepEqual(setConceptLanguage(a,'ja',''),['旧别名','en: Old name']);assert.equal(conceptLanguageTag('EN： Test')[2],'Test');});
test('search strips language prefix and splits multilingual aliases',()=>assert.deepEqual(conceptNameVariants(['zh: 档案实践','ja: アーカイブ実践','Archival Practices / Archive practice']),['档案实践','アーカイブ実践','Archival Practices','Archive practice']));
