// TEST ONLY. Whole reviewed SOURCE inputs -> genuine587 historical oracle inputs.
// No runtime loading, model admission, publication, storage or SOURCE authority.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const bytes=fs.readFileSync(new URL('./source-weather-entrypoint-review.json',import.meta.url));
assert.equal(sha(bytes),'3303120a2f1dd8cafce7d297d092f2c525977fbb1850f43cc18282ce11075b69','Whole SOURCE weather review descriptor');
const review=JSON.parse(bytes);
assert.equal(review.schemaVersion,1);
assert.equal(review.kind,'TEST_ONLY_EXACT_SOURCE_WEATHER_ENTRYPOINT_INVERSE');
assert.equal(review.productionAuthority,false);
assert.equal(review.predecessorHead,'54fab9ca0f5e4b2965440440e40d8f89a903e82e');
assert.equal(review.sourceHead,'e5c9716829c8e4f6bff30cf79d602ed45ed6896b');
assert.deepEqual(Object.keys(review.roles),['writer','manifest']);
for(const [role,row]of Object.entries(review.roles)){
  assert.equal(row.edits.length,role==='writer'?4:14);
  row.edits.forEach(Object.freeze);Object.freeze(row.edits);
  Object.freeze(row.predecessor);Object.freeze(row.actual);Object.freeze(row);
}
Object.freeze(review.roles);Object.freeze(review);
export const SOURCE_WEATHER_ENTRYPOINT_REVIEW=review;
export function inverseSourceWeatherEntrypointTestInput(source,role){
  assert.equal(arguments.length,2);
  assert.equal(typeof source,'string','Whole SOURCE weather source text');
  assert(Object.hasOwn(review.roles,role),'Only SOURCE weather writer/manifest roles');
  const row=review.roles[role];
  if(Buffer.byteLength(source)===row.predecessor.bytes&&sha(source)===row.predecessor.sha256)return source;
  assert.equal(Buffer.byteLength(source),row.actual.bytes,'Whole reviewed SOURCE weather input size');
  assert.equal(sha(source),row.actual.sha256,'Whole reviewed SOURCE weather input SHA');
  let prior=source,last=Infinity,hunk=row.edits.length+1;
  for(const edit of row.edits){
    assert.equal(edit.sourceHunk,--hunk,'Exact SOURCE weather hunk order');
    assert(Number.isSafeInteger(edit.offset)&&edit.offset>=0&&edit.offset<last,'Exact SOURCE weather hunk offset');
    last=edit.offset;
    assert.equal(sha(edit.current),edit.currentSha256,'Whole SOURCE weather current hunk');
    assert.equal(sha(edit.original),edit.originalSha256,'Whole SOURCE weather original hunk');
    assert.equal(sha(prior),edit.beforeSha256,'Whole SOURCE weather intermediate input');
    assert.equal(prior.slice(edit.offset,edit.offset+edit.current.length),edit.current,'Exact SOURCE weather literal hunk');
    prior=prior.slice(0,edit.offset)+edit.original+prior.slice(edit.offset+edit.current.length);
    assert.equal(sha(prior),edit.afterSha256,'Whole SOURCE weather intermediate inverse');
  }
  assert.equal(hunk,1);
  assert.equal(Buffer.byteLength(prior),row.predecessor.bytes,'Whole genuine587 SOURCE weather oracle size');
  assert.equal(sha(prior),row.predecessor.sha256,'Whole genuine587 SOURCE weather oracle SHA');
  return prior;
}
