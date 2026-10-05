import { spawnSync } from 'node:child_process';
const commands = [
  [process.env.RAVRADAR_PYTHON || 'python', ['scripts/test-jordrav-model.py']],
  [process.execPath, ['--test','scripts/test-jordrav-data.mjs']],
  [process.execPath, ['--test','scripts/test-jordrav-search-context.mjs']],
  [process.execPath, ['--test','scripts/test-jordrav-view-state.mjs']]
];
for (const [program,args] of commands) {
  const result=spawnSync(program,args,{stdio:'inherit',shell:false});
  if(result.error)console.error(result.error.message);
  if(result.status!==0||result.error||result.signal)process.exit(1);
}
