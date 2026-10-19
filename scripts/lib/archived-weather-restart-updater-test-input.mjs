// TEST INPUT ONLY: whole D8 -> 8b archived-restart delta, never a production adapter.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const bytes=fs.readFileSync(new URL('./archived-weather-restart-updater-test-input.json',import.meta.url),'utf8').replaceAll('\r\n','\n');
assert.equal(sha(bytes),'8c2b48b2e89e01012bdc9c11ebf9bd171dcd46c84613ea8378f7db5bee370937',
  'ARCHIVED_RESTART_TEST_INPUT_REVIEW_CHANGED');
const review=JSON.parse(bytes);
export function inverseArchivedWeatherRestartUpdater(input) {
  assert.equal(typeof input,'string');
  let source=input.replaceAll('\r\n','\n');
  if(sha(source)===review.before.sha256) return source;
  assert.equal(sha(source),review.after.sha256,'ALTERNATIVE_C_TEST_INPUT_CHANGED:ARCHIVED_RESTART_WHOLE');
  assert.equal(Buffer.byteLength(source),review.after.bytes);
  for(const [before,after] of [...review.hunks].reverse()) {
    assert.equal(source.split(after).length,2,'ARCHIVED_RESTART_TEST_INPUT_HUNK');
    source=source.replace(after,()=>before);
  }
  assert.equal(sha(source),review.before.sha256,'ARCHIVED_RESTART_TEST_INPUT_WHOLE_INVERSE');
  assert.equal(Buffer.byteLength(source),review.before.bytes);
  return source;
}
