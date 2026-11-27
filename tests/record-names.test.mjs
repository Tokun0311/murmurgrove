import test from 'node:test';
import assert from 'node:assert/strict';
import {recordNames,institutionListNames} from '../src/lib/record-names.mjs';
import {setConceptLanguage} from '../murmurgrove-editor/assets/bundle-links.mjs';
test('person uses nativeName and explicit language fields',()=>{
 const n=recordNames({name:'Ryuichi Sakamoto',nativeName:'坂本龍一',alternativeNames:['zh: 坂本龙一','ja: 坂本龍一','en: Ryuichi Sakamoto']},'people','ryuichi-sakamoto');
 assert.equal(n.primary,'Ryuichi Sakamoto');assert.equal(n.native,'坂本龍一');assert.deepEqual(n.aliases,['坂本龙一']);assert.ok(n.terms.includes('坂本龙一'));
});
test('old Sakamoto snapshot has display-only fallback',()=>assert.equal(recordNames({name:'Ryuichi Sakamoto'},'people','ryuichi-sakamoto').native,'坂本龍一'));
test('legacy bilingual names in either order',()=>{
 assert.equal(recordNames({name:'森美術館 / Mori Art Museum'},'institutions','mori-art-museum').primary,'Mori Art Museum');
 assert.equal(recordNames({name:'国際文化会館（International House of Japan）'},'institutions').primary,'International House of Japan');
 const n=recordNames({name:'Atsushi Yamamoto / 山本 篤',nativeName:'山本 篤'},'people');assert.equal(n.native,'山本 篤');assert.equal(n.primary,'Atsushi Yamamoto');assert.deepEqual(n.aliases,[]);
});
test('existing native-only institutions get an English index label and original remains searchable',()=>{
 const n=institutionListNames({name:'世田谷美術館'},'setagaya-art-museum');assert.equal(n.display,'Setagaya Art Museum');assert.ok(n.terms.includes('世田谷美術館'));
});
test('explicit English replaces only display name, even on legacy entries',()=>assert.equal(recordNames({name:'世田谷美術館',alternativeNames:['en: User-preferred English']},'institutions','setagaya-art-museum').primary,'User-preferred English'));
test('new records use same language rules; absent English preserves original instead of guessing',()=>{
 const n=recordNames({name:'新機関',alternativeNames:['en: New Institute','ja: 新機関','zh: 新机构']},'institutions','new');assert.equal(n.primary,'New Institute');assert.equal(n.native,'新機関');assert.ok(n.terms.includes('新机构'));
 assert.equal(recordNames({name:'新機関'},'institutions','new').primary,'新機関');
});
test('site labels are retained only for non-reference venues',()=>{
 assert.equal(institutionListNames({name:'SKWAT',venueName:'SKAC',venueStatus:'user-supplied'}).related,'SKWAT');assert.equal(institutionListNames({name:'SKWAT',venueName:'SKAC',venueStatus:'reference'}).display,'SKWAT');
});
test('no loss of existing aliases when adding or clearing translated field',()=>{
 const a=setConceptLanguage(['alias','ja: 原名','en: old'],'en','New name');assert.deepEqual(a,['alias','ja: 原名','en: New name']);assert.deepEqual(setConceptLanguage(a,'en',''),['alias','ja: 原名']);
});
