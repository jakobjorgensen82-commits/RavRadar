#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ACTIVE_RUN_STATUSES = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);
const KNOWN_RUN_STATUSES = new Set([...ACTIVE_RUN_STATUSES, 'completed']);
const FAILED_SCHEDULE_CONCLUSIONS = new Set(['failure', 'timed_out', 'startup_failure']);
const finiteTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));

// Reporting only. The existing bounded silence policy still owns dispatch.
// No alert is sent here: this observer has no durable notification lifecycle.
export function assessProductionFreshnessAdvisory({ workflowRuns, manifest, nowMs, maximumSilenceMinutes, active }) {
  const referenceKind = manifest?.productionReferenceAt == null ? 'generatedAt' : 'productionReferenceAt';
  const referenceMs = Date.parse(manifest?.[referenceKind] ?? '');
  if (!Number.isFinite(referenceMs) || referenceMs > nowMs) {
    return { code: 'PUBLIC_WEATHER_TIME_UNVERIFIED', referenceKind, publicReferenceAt: null,
      publicAgeMinutes: null, recentFailedScheduledRuns: 0, activeRun: Boolean(active),
      nextAction: 'INSPECT_PUBLIC_MANIFEST_TIME', notificationSent: false, privatePayloadIncluded: false };
  }
  const silenceMs = maximumSilenceMinutes * 60_000;
  const stale = nowMs - referenceMs > silenceMs;
  // Only scheduled failures are unambiguously normal production in this
  // workflow: manual runs may instead be private geometry or model operations.
  const recentFailures = workflowRuns.filter(run => run.event === 'schedule'
    && run.status === 'completed' && FAILED_SCHEDULE_CONCLUSIONS.has(run.conclusion)
    && Date.parse(run.created_at) > referenceMs
    && Date.parse(run.created_at) <= nowMs
    && nowMs - Date.parse(run.created_at) <= silenceMs);
  const persistentFailure = stale && recentFailures.length >= 2;
  return {
    code: persistentFailure ? 'PUBLIC_WEATHER_STALE_AFTER_REPEATED_FAILURES' : stale ? 'PUBLIC_WEATHER_STALE' : 'NO_PUBLIC_STALENESS_SIGNAL',
    referenceKind, publicReferenceAt: new Date(referenceMs).toISOString(),
    publicAgeMinutes: Math.floor((nowMs - referenceMs) / 60_000),
    staleThresholdMinutes: maximumSilenceMinutes,
    recentFailedScheduledRuns: recentFailures.length,
    activeRun: Boolean(active),
    nextAction: persistentFailure
      ? active ? 'WAIT_FOR_ACTIVE_RUN_THEN_INSPECT_FAILED_PRODUCTION' : 'INSPECT_FAILED_PRODUCTION_SUMMARY'
      : stale ? active ? 'WAIT_FOR_ACTIVE_RUN' : 'FOLLOW_EXISTING_BOUNDED_RECOVERY' : 'NONE',
    notificationSent: false,
    privatePayloadIncluded: false,
  };
}

export function productionWatchdogSummary(result) {
  const advisory = result.advisory;
  const title = advisory.code === 'PUBLIC_WEATHER_STALE_AFTER_REPEATED_FAILURES'
    ? 'Vejret på hjemmesiden bliver ikke fornyet trods gentagne kørsler'
    : advisory.code === 'PUBLIC_WEATHER_STALE' ? 'Hjemmesidens vejr er forsinket'
      : advisory.code === 'PUBLIC_WEATHER_TIME_UNVERIFIED' ? 'Vejrets tidspunkt kunne ikke bekræftes'
        : 'Ingen forsinkelse fundet i denne observation';
  const lines = ['## RavRadars automatiske driftsstatus', '', title + '.', ''];
  if (advisory.publicReferenceAt) {
    const localTime = new Intl.DateTimeFormat('da-DK', { timeZone: 'Europe/Copenhagen',
      dateStyle: 'short', timeStyle: 'short' }).format(new Date(advisory.publicReferenceAt));
    lines.push(`${advisory.referenceKind === 'productionReferenceAt' ? 'Offentlig vejrreference' : 'Offentlig fil oprettet (vejrreferencen mangler)'}: ${localTime} dansk tid, ${advisory.publicAgeMinutes} minutter siden.`);
    lines.push(`Fejlede planlagte kørsler i de seneste ${advisory.staleThresholdMinutes} minutter: ${advisory.recentFailedScheduledRuns}.`, '');
  }
  const actions = {
    INSPECT_PUBLIC_MANIFEST_TIME: 'Næste skridt: kontrollér tidspunktet i det offentlige manifest. Dette er ikke bevis for, at vejret er aktuelt.',
    WAIT_FOR_ACTIVE_RUN_THEN_INSPECT_FAILED_PRODUCTION: 'Der kører eller venter allerede en opdatering. Lad den afslutte. Er vejret stadig gammelt bagefter, så åbn den seneste fejlede kørsel under “Update weather and deploy RavRadar” og læs dens slutoversigt for det trin, der kræver hjælp.',
    INSPECT_FAILED_PRODUCTION_SUMMARY: 'Næste skridt: åbn den seneste fejlede kørsel under “Update weather and deploy RavRadar” og læs slutoversigten. Et midlertidigt leverandørudfald genforsøges allerede automatisk; den samme vedvarende fejl skal løses i det angivne trin, ikke med flere samtidige genstarter.',
    WAIT_FOR_ACTIVE_RUN: 'Der kører eller venter allerede en opdatering. Lad den afslutte; denne rapport starter ikke flere kørsler.',
    FOLLOW_EXISTING_BOUNDED_RECOVERY: 'Den eksisterende vagthund håndterer dokumenteret stilhed. Hvis prognoserne fortsat ikke fornyes, så læs slutoversigten fra den seneste produktionskørsel.',
    NONE: 'Ingen manuel handling foreslået. Dette er en tidskontrol, ikke bevis for komplet vejrdatadækning.',
  };
  lines.push(actions[advisory.nextAction], '',
    'Denne oversigt er kun en statusrapport. Den sender ingen notifikation og ændrer ikke retry, deploy eller beslutningen om at starte en kørsel.', '');
  return lines.join('\n');
}

export function assessProductionWatchdog({
  runs,
  manifest,
  nowMs = Date.now(),
  maximumSilenceMinutes = 45,
  branch = 'main',
}) {
  if (!Number.isFinite(nowMs) || maximumSilenceMinutes < 15 || maximumSilenceMinutes > 180) {
    throw new Error('Production watchdog received an invalid bounded time policy');
  }
  if (typeof branch !== 'string' || !branch.trim()) {
    throw new Error('Production watchdog received an invalid branch policy');
  }
  const allWorkflowRuns = Array.isArray(runs?.workflow_runs) ? runs.workflow_runs : null;
  if (!allWorkflowRuns) throw new Error('Production watchdog could not validate the workflow-run list');
  const workflowRuns = allWorkflowRuns.filter(run => run?.head_branch === branch);
  if (workflowRuns.length === 0) {
    throw new Error(`Production watchdog could not validate ${branch} workflow-run history`);
  }
  if (workflowRuns.some(run => !KNOWN_RUN_STATUSES.has(String(run?.status || '')) || !finiteTime(run?.created_at))) {
    throw new Error(`Production watchdog found malformed ${branch} workflow-run history`);
  }
  const active = workflowRuns.find(run => ACTIVE_RUN_STATUSES.has(String(run?.status || '')));
  const advisory = assessProductionFreshnessAdvisory({ workflowRuns, manifest, nowMs, maximumSilenceMinutes, active });
  const report = decision => ({ ...decision, advisory });
  if (active) return report({ dispatch: false, reason: 'production-run-active' });
  const newestRunMs = workflowRuns
    .map(run => Date.parse(run?.created_at || ''))
    .filter(Number.isFinite)
    .sort((left, right) => right - left)[0] ?? Number.NEGATIVE_INFINITY;
  const manifestMs = Date.parse(manifest?.generatedAt || '');
  if (!Number.isFinite(manifestMs)) throw new Error('Production watchdog could not validate the public manifest time');
  const silenceMs = maximumSilenceMinutes * 60_000;
  if (nowMs - newestRunMs <= silenceMs) return report({ dispatch: false, reason: 'recent-production-run' });
  if (nowMs - manifestMs <= silenceMs) return report({ dispatch: false, reason: 'public-production-fresh' });
  return report({
    dispatch: true,
    reason: 'production-silent-and-public-manifest-stale',
    runSilenceMinutes: Number.isFinite(newestRunMs) ? Math.floor((nowMs - newestRunMs) / 60_000) : null,
    manifestAgeMinutes: Math.floor((nowMs - manifestMs) / 60_000),
  });
}

function parseArgs(argv) {
  const result = { maximumSilenceMinutes: 45, branch: 'main' };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--runs') result.runsPath = argv[++index];
    else if (value === '--branch') result.branch = argv[++index];
    else if (value === '--manifest-url') result.manifestUrl = argv[++index];
    else if (value === '--github-output') result.githubOutput = argv[++index];
    else if (value === '--summary') result.summaryPath = argv[++index];
    else if (value === '--report') result.reportPath = argv[++index];
    else if (value === '--maximum-silence-minutes') result.maximumSilenceMinutes = Number(argv[++index]);
    else throw new Error(`Ukendt argument: ${value}`);
  }
  if (!result.runsPath || !result.manifestUrl) throw new Error('--runs og --manifest-url er påkrævet');
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [runs, response] = await Promise.all([
    fs.readFile(options.runsPath, 'utf8').then(JSON.parse),
    fetch(options.manifestUrl, { headers: { accept: 'application/json' } }),
  ]);
  if (!response.ok) throw new Error(`Public manifest returned HTTP ${response.status}`);
  const result = assessProductionWatchdog({
    runs,
    manifest: await response.json(),
    maximumSilenceMinutes: options.maximumSilenceMinutes,
    branch: options.branch,
  });
  if (options.githubOutput) {
    await fs.appendFile(options.githubOutput, `dispatch=${result.dispatch ? 'true' : 'false'}\nreason=${result.reason}\n`);
  }
  if (options.summaryPath) await fs.appendFile(options.summaryPath, productionWatchdogSummary(result));
  if (options.reportPath) await fs.writeFile(options.reportPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
