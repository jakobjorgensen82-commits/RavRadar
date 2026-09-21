import fs from 'node:fs/promises';
import { assertMonotonicPagesGeneration, readBoundedPublicManifest } from './lib/pages-generation-order.mjs';

const args = process.argv.slice(2);
const option = name => { const at = args.indexOf(name); return at < 0 ? null : args[at + 1]; };
const handoff = option('--handoff');
if (!handoff) throw new Error('Generation admission requires an exact handoff directory');
const recoverySourceSha256 = option('--recovery-source-sha256');
const url = new URL(option('--base-url'));
url.pathname = `${url.pathname.replace(/\/$/, '')}/data/live/manifest.json`;
url.searchParams.set('generation-admission', `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}-${Date.now()}`);
const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`Public generation could not be observed (${response.status})`);
const publicText = await readBoundedPublicManifest(response);
const targetText = await fs.readFile(`${handoff}/manifest.json`, 'utf8');
const reuseReport = await fs.readFile(`${handoff}/code-only-reuse.json`, 'utf8').then(JSON.parse)
  .catch(error => { if (error.code === 'ENOENT') return null; throw error; });
console.log(assertMonotonicPagesGeneration({ targetText, publicText, reuseReport, recoverySourceSha256 }));
