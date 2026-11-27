import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanPersonBoundary,peopleOrderKey,peopleLetter,comparePeople} from '../src/lib/people-order.mjs';
import {recordNames} from '../src/lib/record-names.mjs';
test('remove invisible leading/trailing separators without changing spelling',()=>{
 assert.equal(cleanPersonBoundary('\u200b \u200bElsewhere in India\u200b '),'Elsewhere in India');
 assert.equal(cleanPersonBoundary('坂本龍一'),'坂本龍一');assert.equal(cleanPersonBoundary('a\u200db'),'a\u200db');
});
test('accented initial and fullwidth initial group correctly',()=>{
 assert.equal(peopleLetter(' Émile'),'E');assert.equal(peopleLetter('Ａoki'),'A');assert.equal(peopleLetter('山本篤'),'');assert.equal(peopleOrderKey('ILĀ & MONOM'),'ILA & MONOM');
});
test('order and filter use same visible initial, numeric before A and Other after Z',()=>{
 const names=['\u200b \u200bElsewhere in India','Yuri Suzuki','Émile','A K Dolven','5D','山本篤','Nicola Privato'];
 assert.deepEqual(names.sort(comparePeople),['5D','A K Dolven','\u200b \u200bElsewhere in India','Émile','Nicola Privato','Yuri Suzuki','山本篤']);
});
test('display and aliases clean boundary without changing native or accented spelling',()=>{
 const n=recordNames({name:'\u200b Émile',nativeName:'\u200b 坂本龍一',alternativeNames:['ja: \u200b 坂本龍一','en: \u200b Émile']},'people');assert.equal(n.primary,'Émile');assert.equal(n.native,'坂本龍一');
});
