import fs from 'node:fs/promises';
import { decideSourceGate, sourceGateRecord } from './lib/weather-source-gate.mjs';

const path = '.cache/weather-source-validation.json';
const env = process.env;
if (process.argv[2] === 'record') {
  const record = sourceGateRecord(env, env.SOURCE_GATE_OUTCOME);
  await fs.mkdir('.cache', { recursive: true });
  await fs.writeFile(path, `${JSON.stringify(record)}\n`);
} else if (process.argv[2] === 'check') {
  let record = null;
  try { record = JSON.parse(await fs.readFile(path, 'utf8')); } catch { /* run the source gate */ }
  const decision = await decideSourceGate(record, env, async route => {
    const response = await fetch(`https://api.github.com${route}`, {
      headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('GitHub proof is unavailable');
    return response.json();
  });
  await fs.appendFile(env.GITHUB_OUTPUT, `required=${decision.required}\n`);
  console.log(`Source gate: required=${decision.required}; reason=${decision.reason}`);
} else {
  throw new Error('Expected check or record');
}
