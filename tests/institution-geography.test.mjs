import test from 'node:test';
import assert from 'node:assert/strict';
import {groupCountries,regionForCountry} from '../src/lib/institution-geography.mjs';
test('new countries and regions appear without changing the navigation template',()=>{
 const entries=['Japan','Switzerland','China','United States','Brazil','South Africa','Australia','Unknown test label'].map(country=>({country}));
 const groups=groupCountries(entries);
 assert.deepEqual(groups.flatMap(g=>g.entries).map(e=>e.country).sort(),entries.map(e=>e.country).sort());
 for (const [country,region] of [['Switzerland','Europe'],['China','Asia'],['United States','North America'],['Brazil','South America'],['South Africa','Africa'],['Australia','Oceania'],['Unknown test label','Other regions']]) assert.equal(regionForCountry(country),region);
});
test('region grouping preserves original labels and ordering, including unknowns',()=>{
 const entries=['South Korea','Japan','Hong Kong','Singapore','Indonesia','Thailand','Germany','Denmark','United Kingdom','France','Switzerland','China','USA','Unrecognized'].map(country=>({country}));
 const groups=groupCountries(entries);
 assert.deepEqual(groups.map(g=>g.region),['Asia','Europe','North America','Other regions']);
 assert.deepEqual(groups[0].entries.map(e=>e.country),['South Korea','Japan','Hong Kong','Singapore','Indonesia','Thailand','China']);
 assert.equal(regionForCountry(' SWITZERLAND '),'Europe');
 assert.equal(regionForCountry('UK'),'Europe');
 assert.equal(groupCountries([]).length,0);
});
