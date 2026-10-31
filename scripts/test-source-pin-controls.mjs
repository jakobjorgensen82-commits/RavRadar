import assert from 'node:assert/strict';
import fs from 'node:fs';

// Check actual full-checkout preparation before the unchanged historical view.
const fullGitPinPreparationSteps = [
  'Prepare exact pinned Candidate G source before source validation',
  'Ensure exact historical Candidate G source is present for full validation',
];
function fullGitPinPreparationStep(source, name) {
  const marker='      - name: '+name+'\n', start=source.indexOf(marker);
  assert.equal(source.split(marker).length,2,'One exact normal pin preparation step');
  const end=source.indexOf('\n      - ',start+marker.length);
  return source.slice(start,end<0?source.length:end);
}
function assertFullGitPinPreparation(source) {
  for(const [index,name]of fullGitPinPreparationSteps.entries()){
    const block=fullGitPinPreparationStep(source,name);
    assert.doesNotMatch(block,/git fetch[^\n]*(?:--depth|--deepen|--unshallow)/,
      'Normal pin preparation must preserve a complete checkout');
    const fetched=index===0?'            test "$(git rev-parse FETCH_HEAD^{commit})" = "$legacy_source_head"\n':'';
    assert.ok(block.includes('          if ! git cat-file -e "${legacy_source_head}^{commit}" 2>/dev/null; then\n'
      +'            git fetch --no-tags origin "$legacy_source_head"\n'+fetched+'          fi\n'),
      'Fetch only a missing pinned commit; preserve fetched identity verification');
    for(const suffix of ['commit','tree'])assert.ok(block.includes(
      '          test "$(git rev-parse "${legacy_source_head}^{'+suffix+'}")" = "$legacy_source_'+(suffix==='commit'?'head':'tree')+'"'),
      'Always verify the exact pinned commit and tree');
    assert.equal((block.match(/^\s+git fetch /gm)??[]).length,index===0?2:1,
      'No additional unguarded pin fetch');
    if(index===0)assert.ok(block.includes('            if ! git cat-file -e "${original_head}^{commit}"; then\n'
      +'              git fetch --no-tags origin "$original_head"\n            fi\n'
      +'            test "$(git rev-parse "${original_head}^{commit}")" = "$original_head"'),
      'Both original readers retain conditional no-depth fetching and exact identities');
  }
}
const actualFullGitBuildSource=fs.readFileSync(new URL('../.github/workflows/reusable-weather-build.yml',import.meta.url),'utf8').replace(/\r\n/g,'\n');
assertFullGitPinPreparation(actualFullGitBuildSource);
for(const name of fullGitPinPreparationSteps){
  const block=fullGitPinPreparationStep(actualFullGitBuildSource,name);
  for(const changed of [
    block.replace('git fetch --no-tags origin','git fetch --no-tags --depth=1 origin'),
    block.replace('if ! git cat-file','if git cat-file'),
    ...['commit','tree'].map(suffix=>block.replace(
      '          test "$(git rev-parse "${legacy_source_head}^{'+suffix+'}")" = "$legacy_source_'+(suffix==='commit'?'head':'tree')+'"','')),
    block+'\n          git fetch --no-tags origin "$legacy_source_head"\n',
  ])assert.throws(()=>assertFullGitPinPreparation(actualFullGitBuildSource.replace(block,()=>changed)));
}
console.log('Full Git pin preparation: raw normal workflow, two steps, ten negative mutations.');
