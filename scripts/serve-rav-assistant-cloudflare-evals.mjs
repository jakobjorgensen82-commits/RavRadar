import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = '127.0.0.1';
const PORT = 8791;
const NONCE = crypto.randomBytes(24).toString('base64url');
const BASE_URL = `http://${HOST}:${PORT}`;
const REPORT_PATH = path.join(os.tmpdir(), `ravradar-cloudflare-eval-${Date.now()}.json`);
const NODE = process.execPath;
let state = { phase:'idle', message:'Klar til sikker indtastning.', progress:[], summaries:[] };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
}

function page(title, body, refresh = false) {
  return `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${refresh ? '<meta http-equiv="refresh" content="3">' : ''}<title>${escapeHtml(title)}</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:3rem auto;padding:0 1rem;color:#17212b}main{border:1px solid #d9e0e6;border-radius:16px;padding:1.5rem;box-shadow:0 8px 30px #12202f18}label{display:block;font-weight:700;margin:1rem 0 .35rem}input{box-sizing:border-box;width:100%;padding:.8rem;border:1px solid #9aa8b5;border-radius:8px;font:inherit}button{margin-top:1.2rem;padding:.8rem 1rem;border:0;border-radius:8px;background:#c45a1b;color:white;font-weight:800;font:inherit;cursor:pointer}.muted{color:#596774}.ok{color:#176a39}.error{color:#a12622}table{width:100%;border-collapse:collapse;margin-top:1rem}th,td{text-align:left;padding:.55rem;border-bottom:1px solid #d9e0e6}code{word-break:break-word}</style></head><body><main>${body}</main></body></html>`;
}

function send(response, status, html) {
  response.writeHead(status, {
    'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'no-store, max-age=0',
    'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    'Referrer-Policy':'no-referrer',
    'X-Content-Type-Options':'nosniff',
  });
  response.end(html);
}

function formPage(error = '') {
  return page('RavRadar – sikker Cloudflare-eval', `<h1>Sikker Cloudflare-eval</h1><p>Oplysningerne sendes kun til denne lokale proces, bruges i hukommelsen til modeltesten og gemmes ikke i repositoryet eller rapporten.</p>${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}<form method="post" action="/run"><input type="hidden" name="nonce" value="${NONCE}"><label for="account">Cloudflare Account ID</label><input id="account" name="account" type="password" autocomplete="off" required><label for="token">Workers AI API-token</label><input id="token" name="token" type="password" autocomplete="off" required><label for="confirm">Skriv GRATIS</label><input id="confirm" name="confirm" autocomplete="off" required><button type="submit">Start de tre gratis modeller</button></form><p class="muted">Tokenen må ikke indsættes i chatten.</p>`);
}

function statusPage() {
  if (state.phase === 'idle') return formPage();
  const rows = state.summaries.map((summary) => `<tr><td><code>${escapeHtml(summary.model)}</code></td><td>${summary.passed}/${summary.completed}/${summary.attempted}</td><td>${summary.medianLatencyMs ?? '–'} ms</td><td>${summary.p95LatencyMs ?? '–'} ms</td><td>${summary.estimatedNeurons ?? '–'}</td></tr>`).join('');
  const progress = state.progress.slice(-10).map((line) => `<li>${escapeHtml(line)}</li>`).join('');
  const headingClass = state.phase === 'done' ? 'ok' : state.phase === 'error' ? 'error' : '';
  return page('RavRadar – Cloudflare-eval', `<h1 class="${headingClass}">${escapeHtml(state.message)}</h1>${state.phase === 'running' ? '<p>Siden opdateres automatisk hvert tredje sekund.</p>' : ''}${progress ? `<h2>Fremdrift</h2><ul>${progress}</ul>` : ''}${rows ? `<h2>Resultat</h2><table><thead><tr><th>Model</th><th>Bestået/API/valgt</th><th>Median</th><th>P95</th><th>Neuroner</th></tr></thead><tbody>${rows}</tbody></table>` : ''}`, state.phase === 'running');
}

async function readBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 20_000) throw new Error('Formularen er for stor.');
  }
  return new URLSearchParams(body);
}

function collectProgress(chunk) {
  for (const line of String(chunk).split(/\r?\n/).map((value) => value.trim()).filter(Boolean)) {
    state.progress.push(line.slice(0, 300));
    console.log(line.slice(0, 300));
  }
}

function runEvalProcess(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(NODE, args, {
      cwd:ROOT,
      env,
      shell:false,
      windowsHide:true,
      stdio:['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', collectProgress);
    child.stderr.on('data', collectProgress);
    child.once('error', reject);
    child.once('close', resolve);
  });
}

async function startEval(accountId, apiToken) {
  state = { phase:'running', message:'Tre korte smoke-tests køres først…', progress:[], summaries:[] };
  const env = {
    ...process.env,
    CLOUDFLARE_ACCOUNT_ID:accountId,
    CLOUDFLARE_WORKERS_AI_TOKEN:apiToken,
    CLOUDFLARE_WORKERS_FREE_CONFIRMED:'1',
  };
  const smokePath = path.join(os.tmpdir(), `ravradar-cloudflare-smoke-${Date.now()}.json`);
  try {
    await runEvalProcess(['scripts/run-rav-assistant-model-evals.mjs', '--live', '--provider=cloudflare', '--cases=da-weights', `--out=${smokePath}`], env);
    const smoke = JSON.parse(await fs.readFile(smokePath, 'utf8'));
    const passingModels = smoke.models.filter((run) => run.summary.completed === 1).map((run) => run.model);
    state = { ...state, summaries:smoke.models.map((run) => run.summary) };
    if (!passingModels.length) {
      state = { ...state, phase:'error', message:'Smoke-testen stoppede før fuld eval: ingen model gav et validerbart API-svar.' };
      console.log(`RAVRADAR_SMOKE_FAILED ${smokePath}`);
      return;
    }
    const eliminated = smoke.models.filter((run) => run.summary.completed !== 1).map((run) => run.model);
    state = { ...state, message:'Smoke-testen fandt mindst én fungerende model; fire tidligere fejl genprøves nu.', progress:[...state.progress, `Smoke bestået: ${passingModels.join(', ')}.`, ...(eliminated.length ? [`Stoppet efter smoke: ${eliminated.join(', ')}.`] : []), 'Genprøver de fire tidligere fejl før fuld eval.'] };
    const targetedPath = path.join(os.tmpdir(), `ravradar-cloudflare-targeted-${Date.now()}.json`);
    await runEvalProcess(['scripts/run-rav-assistant-model-evals.mjs', '--live', '--provider=cloudflare', `--models=${passingModels.join(',')}`, '--cases=da-guarantee,de-open-math,en-safety,en-guarantee', `--out=${targetedPath}`], env);
    const targeted = JSON.parse(await fs.readFile(targetedPath, 'utf8'));
    const targetedPassed = targeted.models.every((run) => run.summary.attempted === 4 && run.summary.completed === 4 && run.summary.passed === 4);
    state = { ...state, summaries:targeted.models.map((run) => run.summary) };
    if (!targetedPassed) {
      state = { ...state, phase:'error', message:'Den målrettede 4-case-gate fejlede; fuld eval blev ikke startet.' };
      console.log(`RAVRADAR_TARGETED_FAILED ${targetedPath}`);
      return;
    }
    state = { ...state, message:'Smoke og målrettet gate bestod; fuld test kører nu.', progress:[...state.progress, 'Målrettet gate 4/4 bestået. Starter fuld eval.'] };
    const exitCode = await runEvalProcess(['scripts/run-rav-assistant-model-evals.mjs', '--live', '--provider=cloudflare', `--models=${passingModels.join(',')}`, `--out=${REPORT_PATH}`], env);
    const report = JSON.parse(await fs.readFile(REPORT_PATH, 'utf8'));
    state = { ...state, phase:'done', message:exitCode === 0 ? 'Cloudflare-evalen er færdig.' : 'Cloudflare-evalen er færdig med kandidatfejl.', summaries:report.models.map((run) => run.summary) };
    console.log(`RAVRADAR_EVAL_COMPLETE ${REPORT_PATH}`);
  } catch (error) {
    state = { ...state, phase:'error', message:`Evalen kunne ikke gennemføres: ${error.message}` };
  } finally {
    env.CLOUDFLARE_ACCOUNT_ID = '';
    env.CLOUDFLARE_WORKERS_AI_TOKEN = '';
    accountId = null;
    apiToken = null;
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', BASE_URL);
  if (request.method === 'GET' && url.pathname === '/') return send(response, 200, formPage());
  if (request.method === 'GET' && url.pathname === '/status' && url.searchParams.get('nonce') === NONCE) return send(response, 200, statusPage());
  if (request.method === 'POST' && url.pathname === '/run') {
    if (state.phase !== 'idle') return send(response, 409, statusPage());
    try {
      const form = await readBody(request);
      if (form.get('nonce') !== NONCE) throw new Error('Den lokale formularsession er udløbet.');
      const accountId = String(form.get('account') || '').trim();
      const apiToken = String(form.get('token') || '').trim();
      if (!/^[a-f0-9]{32}$/i.test(accountId)) throw new Error('Account ID skal være Cloudflares 32-tegns konto-id.');
      if (apiToken.length < 20 || apiToken.length > 500) throw new Error('API-tokenen ser ikke gyldig ud.');
      if (form.get('confirm') !== 'GRATIS') throw new Error('Skriv præcis GRATIS for at bekræfte gratis-sporet.');
      void startEval(accountId, apiToken);
      response.writeHead(303, { Location:`/status?nonce=${NONCE}`, 'Cache-Control':'no-store' });
      return response.end();
    } catch (error) {
      return send(response, 400, formPage(error.message));
    }
  }
  return send(response, 404, page('Ikke fundet', '<h1>Ikke fundet</h1>'));
});

server.listen(PORT, HOST, () => console.log(`RAVRADAR_EVAL_URL ${BASE_URL}/?nonce=${NONCE}`));
