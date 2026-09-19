import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function exactPagesAttemptStep(jobs, { runId, runAttempt, headSha }) {
  const selected = jobs.filter(job => Number(job.run_id) === Number(runId)
    && Number(job.run_attempt) === Number(runAttempt) && job.head_sha === headSha
    && (job.name === 'Deploy prepared Pages artifact'
      || job.name?.endsWith(' / Deploy prepared Pages artifact')));
  if (selected.length !== 1) throw new Error('Expected one unambiguous exact-run Pages deployment job');
  const steps = selected[0].steps?.filter(step => step.name === 'Deploy to GitHub Pages') ?? [];
  if (steps.length !== 1) throw new Error('Expected one exact Pages deployment step');
  if (!['success', 'failure', 'cancelled', 'skipped'].includes(steps[0].conclusion)) {
    throw new Error('Pages deployment step is not terminal');
  }
  return steps[0].conclusion;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [file, runId, runAttempt, headSha] = process.argv.slice(2);
  if (!/^[a-f0-9]{40}$/.test(headSha ?? '')) throw new Error('Missing exact attempt head');
  const document = JSON.parse(await fs.readFile(file, 'utf8'));
  console.log(exactPagesAttemptStep(document.jobs ?? [], { runId, runAttempt, headSha }));
}
