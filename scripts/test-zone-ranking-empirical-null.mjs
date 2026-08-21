import assert from 'node:assert/strict';
import {empiricalMidrank,mapToReferenceEquivalent} from './calibrate-zone-ranking-empirical-null.mjs';

assert.equal(empiricalMidrank([10,20,20,30],20),.5);
assert.equal(empiricalMidrank([10,20,30,40],10),.125);

const single=[10,20,30,40];
const identity=mapToReferenceEquivalent(30,single,single);
assert.equal(identity.percentile,.625);
assert.equal(identity.equivalent,28.75);

const advantaged=[20,30,40,50];
const normalized=mapToReferenceEquivalent(40,advantaged,single);
assert.ok(normalized.equivalent<40,'En almindelig høj bedst-af-mange-værdi skal normaliseres ned.');

console.log('Zone-ranking empirical null: OK');

