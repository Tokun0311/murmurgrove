import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeExhibition,validateAiSuggestions,buildAiPrompt } from '../analyzer.mjs';
const catalog={
 people:[{slug:'carsten-nicolai',title:'Carsten Nicolai',fields:{name:'Carsten Nicolai'}},{slug:'mikami-seiko',title:'三上晴子',fields:{name:'三上晴子'}}],
 institutions:[{slug:'hosoo-gallery',title:'HOSOO GALLERY',fields:{name:'HOSOO GALLERY'}}],
 concepts:[{slug:'site-specificity',title:'场域特定性',fields:{title:'场域特定性'}},{slug:'sound-and-technology',title:'声音与技术',fields:{title:'声音与技术'}}],
 exhibitions:[{slug:'old',title:'Previous show',fields:{artists:['carsten-nicolai'],concepts:['sound-and-technology'],institution:'hosoo-gallery'}},{slug:'current',title:'Current',fields:{}}]
};
test('local multilingual exact names, vocabulary, evidence and related records',()=>{
 const request={slug:'current',title:'Carsten Nicolai — Field',location:'HOSOO GALLERY',body:'This site-specific sound art installation works with 记忆与场所 and Carsten Nicolai.',fields:{artists:[],concepts:[],relatedInstitutions:[]}};
 const res=analyzeExhibition(request,catalog);
 assert.equal(res.groups.people[0].id,'carsten-nicolai');
 assert.equal(res.groups.institutions[0].id,'hosoo-gallery');
 assert.deepEqual(res.groups.concepts.map(x=>x.id).sort(),['site-specificity','sound-and-technology']);
 assert.equal(res.groups.concepts.find(x=>x.id==='site-specificity').method,'vocabulary');
 assert.ok(res.groups.concepts.every(x=>x.evidence?.quote?.includes(x.evidence.matched)));
 assert.equal(res.similar[0].id,'old');
 assert.equal(res.note.includes('No semantic'),true);
});
test('do not guess entities without evidence; existing links not proposed twice',()=>{
 const res=analyzeExhibition({title:'An unrelated show',body:'A new exhibition of art.',location:'Other location',fields:{artists:['carsten-nicolai']}},catalog);
 assert.equal(res.groups.people.length,0);assert.equal(res.groups.institutions.length,0);
 assert.equal(res.groups.concepts.length,0);
});
test('AI candidates must cite existing ID and verifiable quote; never accepted automatically',()=>{
 const request={title:'Carsten Nicolai',body:'A site-specific sound artwork in Kyoto.',location:'HOSOO GALLERY'};
 const ai={suggestions:[
  {group:'people',id:'carsten-nicolai',evidence:'Carsten Nicolai',reason:'named'},
  {group:'concepts',id:'site-specificity',evidence:'site-specific',reason:'interpretive'},
  {group:'concepts',id:'invented-concept',evidence:'site-specific',reason:'invented ID'},
  {group:'institutions',id:'hosoo-gallery',evidence:'This quote does not exist',reason:'invented evidence'},
 ]};
 const res=validateAiSuggestions(ai,request,catalog);
 assert.equal(res.acceptedCandidates,2);assert.equal(res.discarded,2);
 assert.equal(res.groups.people[0].method,'ai-inference');
 assert.match(buildAiPrompt(request,catalog),/existing-id/);
});
test('does not allow AI import to create a record or overwrite source fields',()=>{
 const res=validateAiSuggestions({suggestions:[{group:'people',id:'mikami-seiko',evidence:'HOSOO',reason:'possible'}]},
  {title:'',body:'',location:'HOSOO GALLERY'},catalog);
 assert.equal(res.acceptedCandidates,0);assert.equal(res.discarded,1);
});
