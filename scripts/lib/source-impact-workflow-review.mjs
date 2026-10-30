import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// One reviewed controller delta against the actually qualified 334 FULL path.
// This does not qualify a run or turn skipped SQL/national steps into success.
// Historical oracles receive the original WHOLE workflow after this contract
// has checked every new selection field and the exact new target registration.
export const SOURCE_IMPACT_FULL_WORKFLOW_ORIGIN='334ab797ab8f2eedd077a50dec8fc4b6a80c9127';
export const SOURCE_IMPACT_FULL_WORKFLOW_SHA256='0876eeadcf5ca712b5dcf054515829c12afe8637f6511e90b52aa87030a33f43';
export const SOURCE_IMPACT_FULL_STEP_CONDITION="        if: ${{ steps.source-content.outputs.selection != 'TARGETED' }}\n";
export const SOURCE_IMPACT_CONTROL_TARGETS=Object.freeze([
  'node scripts/test-source-impact-plan.mjs',
  'node scripts/test-source-impact-git-diff.mjs',
  'node --test scripts/test-source-impact-full-baseline.mjs',
  'node scripts/test-source-targeted-receipt.mjs',
  'node scripts/test-source-targeted-producer.mjs',
  'node scripts/test-source-targeted-consumer.mjs',
  'node scripts/test-source-impact-workflow.mjs',
]);
const ROUTING='          node scripts/test-post-cutover-migration-routing.mjs &&\n';
const TOKEN='          GITHUB_TOKEN: ${{ github.token }}\n';
const OLD_PATH='          path: .cache/source-tree-content-proof.json\n';
const NEW_PATH="          path: ${{ steps.source-content.outputs.receipt_path || '.cache/source-tree-content-proof.json' }}\n";
const TARGETS=SOURCE_IMPACT_CONTROL_TARGETS.map(command=>'          && '+command+'\n').join('');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const once=(source,from,to)=>{assert.equal(source.split(from).length,2,'Exact once-only reviewed workflow field required');
  return source.replace(from,()=>to);};

export function projectSourceImpactWorkflowFull(value){
  assert.equal(arguments.length,1);assert.equal(typeof value,'string');
  let source=value.replace(/\r\n/g,'\n');
  if(sha(source)===SOURCE_IMPACT_FULL_WORKFLOW_SHA256)return source;
  const selected=/steps\.source-content\.outputs\.(?:selection|receipt_path)|test-source-(?:impact|targeted)-/.test(source);
  if(selected){
    const rows=[...source.matchAll(/^      - (?:name|uses):[^\n]*\n/gm)];
    // GitHub adds Set up job as step 1: 21 YAML entries retain runtime 2–22.
    assert.equal(rows.length,21,'Keep 21 declared steps and GitHub Set up job: 22 runtime steps');
    const blocks=rows.map((row,index)=>source.slice(row.index,rows[index+1]?.index??source.length));
    assert(blocks[3].startsWith('      - name: Build deterministic source-tree content identity\n'));
    blocks[3]=once(blocks[3],'        run: node scripts/weather-source-gate.mjs impact-digest\n',
      '        run: node scripts/weather-source-gate.mjs digest\n');
    blocks[3]=once(blocks[3],TOKEN,'');
    for(let index=4;index<=18;index++){
      const header=rows[index][0];blocks[index]=once(blocks[index],header+SOURCE_IMPACT_FULL_STEP_CONDITION,header);
    }
    assert(blocks[5].startsWith('      - uses: actions/setup-python@v7\n'));
    assert(blocks[6].startsWith('      - name: Install source-gate dependencies\n'));
    blocks[6]=once(blocks[6],TARGETS,'');
    assert(blocks[19].startsWith('      - name: Require validated source tree to remain unchanged\n'));
    assert(blocks[20].startsWith('      - name: Upload tree-content source validation proof\n'));
    blocks[20]=once(blocks[20],NEW_PATH,OLD_PATH);
    source=source.slice(0,rows[0].index)+blocks.join('');
    source=once(source,ROUTING,'');
    assert.equal(sha(source),SOURCE_IMPACT_FULL_WORKFLOW_SHA256,
      'Only the reviewed selection/token/targets/receipt path and early routing may differ from qualified 334 FULL');
    return source;
  }
  if(source.includes('test-post-cutover-migration-routing.mjs')){
    source=once(source,ROUTING,'');
    assert.equal(sha(source),SOURCE_IMPACT_FULL_WORKFLOW_SHA256,
      'Only the already reviewed normal early routing addition may differ from qualified 334 FULL');
  }
  // Genuine older workflows still pass through their unchanged old oracles.
  return source;
}
