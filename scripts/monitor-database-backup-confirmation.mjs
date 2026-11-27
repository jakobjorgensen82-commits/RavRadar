import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repository = 'jakobjorgensen82-commits/RavRadar';
const repositoryId = 1306858343;
const maintenance = 'maintain-admin-document-history.yml';
const maintenanceJob = 'Maintain one due private database backup after document history';
const prerequisites = [
  'Require the already qualified exact source before backup access',
  'Reject missing backup source proof before private access',
  'Plan one due database action in the original weather window',
];
const positiveStep = 'Database backup plan - current archive not due';
const hour = 60 * 60 * 1000;
const documentedWindow = 48 * hour;
const eligibilityLookback = 4 * hour;

function requireCompleteList(response, entries) {
  if (!Array.isArray(entries) || entries.length > 100 || response.total_count !== entries.length) {
    throw new Error('BACKUP_CONFIRMATION_INVENTORY_INCOMPLETE');
  }
}

function succeeded(steps, name) {
  const matches = steps.filter(step => step.name === name);
  return matches.length === 1 && matches[0].status === 'completed' && matches[0].conclusion === 'success'
    ? matches[0] : null;
}

export async function inspectRecentBackupConfirmation({fetchMetadata, now = Date.now()} = {}) {
  if (typeof fetchMetadata !== 'function' || !Number.isFinite(now)) throw new Error('BACKUP_CONFIRMATION_ARGUMENTS');
  const cutoff = now - documentedWindow;
  // A valid maintenance run is tied to its original four-hour weather slot.
  // Include the preceding slot and judge freshness by the positive step time.
  const searchStart = new Date(cutoff - eligibilityLookback).toISOString();
  const params = new URLSearchParams({
    branch: 'main', event: 'workflow_dispatch', created: '>=' + searchStart, per_page: '100',
  });
  const prefix = '/repos/' + repository + '/actions';
  const runs = await fetchMetadata(prefix + '/workflows/' + maintenance + '/runs?' + params);
  requireCompleteList(runs, runs?.workflow_runs);
  const checked = new Set();
  for (const run of runs.workflow_runs) {
    if (!Number.isSafeInteger(run.id) || run.id < 1 || checked.has(run.id)
      || run.path !== '.github/workflows/' + maintenance || run.head_branch !== 'main'
      || run.event !== 'workflow_dispatch' || run.repository?.id !== repositoryId
      || run.head_repository?.id !== repositoryId || !/^[a-f0-9]{40}$/.test(run.head_sha ?? '')
      || !Number.isFinite(Date.parse(run.created_at)) || !Number.isFinite(Date.parse(run.updated_at))) {
      throw new Error('BACKUP_CONFIRMATION_RUN_IDENTITY');
    }
    checked.add(run.id);
    if (run.run_attempt !== 1 || run.actor?.login !== 'github-actions[bot]'
      || run.status !== 'completed' || run.conclusion !== 'success'
      || Date.parse(run.updated_at) < cutoff) continue;

    const inbox = await fetchMetadata(prefix + '/runs/' + run.id + '/attempts/1/jobs?per_page=100');
    requireCompleteList(inbox, inbox?.jobs);
    const jobs = inbox.jobs.filter(job => job.name === maintenanceJob);
    if (jobs.length === 0) continue;
    const job = jobs[0];
    if (jobs.length !== 1 || job.run_id !== run.id || job.run_attempt !== 1 || job.head_sha !== run.head_sha) {
      throw new Error('BACKUP_CONFIRMATION_JOB_IDENTITY');
    }
    if (job.status !== 'completed' || job.conclusion !== 'success') continue;
    if (!Array.isArray(job.steps)) throw new Error('BACKUP_CONFIRMATION_STEPS_INCOMPLETE');
    const proof = succeeded(job.steps, positiveStep);
    if (!proof) continue;
    const completed = Date.parse(proof.completed_at);
    const jobCompleted = Date.parse(job.completed_at);
    if (!prerequisites.every(name => {
      const prerequisite = succeeded(job.steps, name);
      return prerequisite && prerequisite.number < proof.number
        && Date.parse(prerequisite.completed_at) <= completed;
    }) || !Number.isFinite(completed) || !Number.isFinite(jobCompleted)
      || completed < Date.parse(run.created_at) || completed > now || completed > jobCompleted) {
      throw new Error('BACKUP_CONFIRMATION_PROOF_IDENTITY');
    }
    if (completed >= cutoff) {
      return {status: 'BACKUP_CONFIRMATION_OBSERVED', runId: run.id, confirmedAt: proof.completed_at};
    }
  }
  return {status: 'BACKUP_CONFIRMATION_UNOBSERVED', windowHours: documentedWindow / hour};
}

async function main() {
  const env = process.env;
  if (process.argv.length !== 2 || env.GITHUB_REPOSITORY !== repository || env.GITHUB_REF !== 'refs/heads/main'
    || env.GITHUB_EVENT_NAME !== 'schedule' || env.GITHUB_RUN_ATTEMPT !== '1'
    || env.GITHUB_JOB !== 'monitor-database-backup-confirmation' || !env.GITHUB_TOKEN) {
    throw new Error('BACKUP_CONFIRMATION_ENVIRONMENT');
  }
  const fetchMetadata = async route => {
    const response = await fetch('https://api.github.com' + route, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(8_000),
      headers: {Authorization: 'Bearer ' + env.GITHUB_TOKEN, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10'},
    });
    if (!response.ok) throw new Error('BACKUP_CONFIRMATION_GITHUB_UNAVAILABLE');
    return response.json();
  };
  const result = await inspectRecentBackupConfirmation({fetchMetadata});
  console.log(JSON.stringify(result));
  if (result.status === 'BACKUP_CONFIRMATION_UNOBSERVED') {
    console.error('::error::GitHub viser ingen verificeret bekræftelse af en aktuel databasebackup inden for 48 timer.');
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    const code = /^BACKUP_CONFIRMATION_[A-Z_]+$/.test(error.message)
      ? error.message : 'BACKUP_CONFIRMATION_METADATA_UNAVAILABLE';
    console.error('::error::Backupkontrollen kunne ikke aflæse GitHub sikkert. ' + code);
    process.exitCode = 1;
  });
}
