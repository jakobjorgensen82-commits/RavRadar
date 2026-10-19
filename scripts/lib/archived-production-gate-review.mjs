// TEST ONLY. Preserve every historical workflow assertion on its exact input.
// The actual production caller receives its separate normal test below.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const bytes=fs.readFileSync(new URL('./archived-production-gate-review.json',import.meta.url));
assert.equal(sha(bytes),'11d7f402b18871a4bd46717de27158fd4db8eba710f2db6c4fb8e9ece78247f7');
const review=JSON.parse(bytes);
assert.equal(review.schemaVersion,1);
assert.equal(review.kind,'TEST_ONLY_EXACT_ARCHIVED_PRODUCTION_GATE_INVERSE');
assert.equal(review.edits.length,2);
export function inverseArchivedProductionGate(source){
  assert.equal(arguments.length,1);assert.equal(typeof source,'string');
  if(sha(source)===review.predecessorSha256)return source;
  assert.equal(sha(source),review.actualSha256,'Unreviewed production gate cannot enter an old oracle');
  let prior=source,last=Infinity;
  for(const [offset,current,original]of review.edits){
    assert(Number.isSafeInteger(offset)&&offset>=0&&offset<last);last=offset;
    assert.equal(prior.slice(offset,offset+current.length),current);
    prior=prior.slice(0,offset)+original+prior.slice(offset+current.length);
  }
  assert.equal(sha(prior),review.predecessorSha256,'The whole historical workflow must be identical');
  return prior;
}
