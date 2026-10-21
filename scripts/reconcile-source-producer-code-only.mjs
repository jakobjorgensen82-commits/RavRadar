// Fixed SOURCE metadata/current code-only CLI. Its normal shared core performs
// actual B-before-S authentication/CAS/readback; no alternate SOURCE operation.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {requireSourceProducerOutput} from './lib/source-producer-successor-source.mjs';
import {reconcileSourceCodeOnlyPrivateRuntimeCheckpoint} from './reconcile-private-runtime-checkpoint.mjs';

export async function reconcileSourceProducerCodeOnly(){
  requireSourceProducerOutput(); // FIRST before argv, environment or file/client use.
  assert.equal(arguments.length,0);assert.equal(process.argv.length,2);
  const output=process.env.GITHUB_OUTPUT;
  assert(typeof output==='string'&&path.isAbsolute(output)&&!/[\r\n\0]/.test(output));
  const outputPath=path.resolve(output),outputStat=await fs.lstat(outputPath);
  assert(outputStat.isFile()&&!outputStat.isSymbolicLink());assert.equal(await fs.realpath(outputPath),outputPath);
  const result=await reconcileSourceCodeOnlyPrivateRuntimeCheckpoint({
    privateRoot:process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT,bundlePath:process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE});
  // Preserve the bounded actual readback outcome before writing job metadata.
  // Failure of a local output file must not erase evidence of a committed CAS.
  console.log(JSON.stringify({kind:'SOURCE_CODE_ONLY_PRIVATE_B_S_RECONCILE',...result}));
  await fs.appendFile(outputPath,'paired='+result.paired+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await reconcileSourceProducerCodeOnly().catch(()=>{
  console.error('SOURCE_CODE_ONLY_B_S_RECONCILE_REFUSED');process.exitCode=1;
});
