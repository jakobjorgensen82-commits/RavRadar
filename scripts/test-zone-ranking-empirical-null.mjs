import assert from 'node:assert/strict';
import {empiricalMidrank,mapToReferenceEquivalent,partialNullCorrection} from './calibrate-zone-ranking-empirical-null.mjs';

assert.equal(empiricalMidrank([10,20,20,30],20),.5);
assert.equal(empiricalMidrank([10,20,30,40],10),.125);

const single=[10,20,30,40];
const identity=mapToReferenceEquivalent(30,single,single);
assert.equal(identity.percentile,.625);
assert.equal(identity.equivalent,28.75);

const advantaged=[20,30,40,50];
const normalized=mapToReferenceEquivalent(40,advantaged,single);
assert.ok(normalized.equivalent<40,'En almindelig høj bedst-af-mange-værdi skal normaliseres ned.');
assert.equal(partialNullCorrection(80,60,.5,1),80,'Én kystdel må aldrig korrigeres.');
assert.equal(partialNullCorrection(80,60,.5,10),70);
assert.equal(partialNullCorrection(80,90,.5,10),80,'Nulmodellen må aldrig løfte en score.');

console.log('Zone-ranking empirical null: OK');
