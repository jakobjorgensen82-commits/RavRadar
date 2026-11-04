import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveProductionReferenceTime } from './lib/production-reference-time.mjs';
import { OPEN_METEO_FUTURE_HOURS, openMeteoPastHours, trimOpenMeteoForecast } from './lib/open-meteo-forecast-window.mjs';
import { readProductionWorkflowSources } from './lib/production-workflow-sources.mjs';

const approvedHour = '2026-08-19T11:00:00Z';
assert.equal(
  resolveProductionReferenceTime(approvedHour, new Date('2026-08-19T12:04:00Z')),
  '2026-08-19T11:00:00.000Z',
  'A run crossing the UTC hour boundary must keep the hour approved by preflight.'
);
assert.equal(
  resolveProductionReferenceTime('', new Date('2026-08-19T12:04:00Z')),
  '2026-08-19T12:04:00.000Z',
  'Local execution without a workflow-approved hour must keep its real build time.'
);
assert.throws(
  () => resolveProductionReferenceTime('2026-08-19T11:37:00Z'),
  /exact UTC hour/,
  'Only an exact preflight hour may freeze production time.'
);

assert.equal(openMeteoPastHours(approvedHour, new Date('2026-08-19T12:04:00Z')), 3, 'Fallback skal hente den laaste time efter et timeskifte.');
const fallbackRows = Array.from({ length: 123 }, (_, index) => ({ time: new Date(Date.parse('2026-08-19T10:00:00Z') + index * 3600000).toISOString(), value: index }));
const trimmedFallback = trimOpenMeteoForecast(fallbackRows, approvedHour);
assert.equal(trimmedFallback.length, OPEN_METEO_FUTURE_HOURS, 'Fallback skal bevare 120 timer efter bagudvinduet.');
assert.equal(trimmedFallback[0].time, '2026-08-19T11:00:00.000Z', 'Fallback skal begynde paa den laaste produktionstime.');

const [workflows, updater, liveBuilder] = await Promise.all([
  readProductionWorkflowSources(),
  fs.readFile('scripts/update-weather.mjs', 'utf8'),
  fs.readFile('scripts/build-live-current-pilot.py', 'utf8'),
]);
const { orchestrator, build } = workflows;

for (const marker of [
  'target_hour: ${{ steps.cache-state.outputs.target_hour }}',
]) {
  assert.ok(orchestrator.includes(marker), `Orkestratoren mangler timeslåsen: ${marker}`);
}
for (const marker of [
  'RAVRADAR_PRODUCTION_TARGET_HOUR: ${{ inputs.production_target_hour }}',
  'Bind production to resolved DMI current hour',
]) {
  assert.ok(build.includes(marker), `Build-workflowet mangler timeslåsen: ${marker}`);
}
const productionHourBindingStart = build.indexOf('name: Bind production to resolved DMI current hour');
const productionHourBindingEnd = build.indexOf('\n      - name:', productionHourBindingStart + 1);
const productionHourBinding = build.slice(
  productionHourBindingStart,
  productionHourBindingEnd < 0 ? undefined : productionHourBindingEnd,
);
for (const marker of [
  'resolved_target="${{ steps.copernicus-targets.outputs.target_hour }}"',
  'if test "${{ steps.weather-source-handoff.outputs.reused }}" = "true"; then',
  'test "$resolved_target" = "${{ steps.weather-source-handoff.outputs.target_hour }}"',
  'echo "RAVRADAR_PRODUCTION_TARGET_HOUR=$resolved_target" >> "$GITHUB_ENV"',
]) {
  assert.ok(productionHourBinding.includes(marker), `Build-workflowets timeslås mangler: ${marker}`);
}
assert.ok(
  productionHourBinding.indexOf('test "$resolved_target" = "${{ steps.weather-source-handoff.outputs.target_hour }}"')
    < productionHourBinding.indexOf('echo "RAVRADAR_PRODUCTION_TARGET_HOUR=$resolved_target" >> "$GITHUB_ENV"'),
  'Et genbrugt handoff-target skal bevises identisk før produktionstimen bindes.',
);
const productionTargetCondition = "if: github.event_name != 'workflow_dispatch' || (inputs.geometry_v2_pilot != true && inputs.geometry_v2_national != true)";
assert.equal(
  orchestrator.split(productionTargetCondition).length - 1,
  1,
  'Timeinspektion skal beregne target_hour for almindelig produktion, men ikke de private geometri-dispatches.'
);
assert.match(
  orchestrator,
  /CHECK_CURRENT_HOUR: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.force != true/,
  'Eksternt startet, almindelig ikke-forceret dispatch skal identificeres før den efterfølgende DMI-timeresolution.'
);
assert.ok(
  build.indexOf('Update DMI bulk model cache') < build.indexOf('Bind production to resolved DMI current hour') &&
    build.indexOf('Bind production to resolved DMI current hour') < build.indexOf('Build public seven-day current history and controlled live selection'),
  'Den endelige produktionstime skal bindes efter frisk DMI og før livefletning.'
);
assert.match(updater, /resolveProductionReferenceTime\(process\.env\.RAVRADAR_PRODUCTION_TARGET_HOUR, new Date\(buildGeneratedAt\)\)/);
assert.match(updater, /generatedAt: buildGeneratedAt, productionReferenceAt: generatedAt/);
assert.match(updater, /output\.datasetId = `rr-\$\{buildGeneratedAt/);
assert.match(updater, /buildWeatherHealth\(previousHealth, output, buildGeneratedAt\)/);
assert.match(updater, /forecastFromOpenMeteo\(feature, generatedAt\)/);
assert.match(updater, /start_hour: startHour, end_hour: endHour/);
assert.match(updater, /new Date\(referenceMs\)\.toISOString\(\)\.slice\(0, 16\)/);
assert.match(liveBuilder, /default=os\.getenv\("RAVRADAR_PRODUCTION_TARGET_HOUR"\)/);

console.log('OK: produktionen låser triggerens time og bevarer samme eksakte target gennem DMI, handoff og fallback.');

// This narrow fixture executes the actual workflow normalizer and the actual
// origin hour/strictly-later predicate. It mints no private-origin capability.
const rawWeatherStart = build.indexOf('      - name: Update central weather cache\n');
const rawWeatherEnd = build.indexOf('\n      - name:', rawWeatherStart + 1);
assert(rawWeatherStart >= 0 && rawWeatherEnd > rawWeatherStart);
const rawWeather = build.slice(rawWeatherStart, rawWeatherEnd);
assert.equal(rawWeather.split('        run: |\n').length, 2);
const runBody = rawWeather.slice(rawWeather.indexOf('        run: |\n') + '        run: |\n'.length, rawWeather.indexOf('        env:\n'))
  .split('\n').map(line => line.startsWith('          ') ? line.slice(10) : line).join('\n').trimEnd();
assert(runBody.endsWith('RAVRADAR_PRODUCTION_TARGET_HOUR="$canonical_target" npm run update:weather'));
assert(!runBody.includes('GITHUB_ENV'), 'Canonical spelling belongs to the weather child, never the global workflow');
const heredocStart = runBody.indexOf("node --input-type=module <<'NODE_WEATHER_TARGET'\n");
const heredocEnd = runBody.indexOf('\nNODE_WEATHER_TARGET', heredocStart);
assert(heredocStart >= 0 && heredocEnd > heredocStart);
const normalize = runBody.slice(heredocStart + "node --input-type=module <<'NODE_WEATHER_TARGET'\n".length, heredocEnd);
const origin = await fs.readFile('scripts/lib/established-native-current-origin.mjs', 'utf8');
const hourFrom = origin.indexOf('const hour = value =>');
const hourTo = origin.indexOf(';', hourFrom);
const actualHour = origin.slice(hourFrom, hourTo + 1);
assert(actualHour.includes('new Date(value).toISOString() === value'));
const scalarFrom = origin.indexOf('async function readScalarFrozen594LaterOrigin(');
const actualGate = origin.slice(scalarFrom).split('\n').find(line => line.includes("'594_LATER_TARGET'"));
assert(actualGate && actualGate.includes('hour(target)') && actualGate.includes('descriptor.productionReferenceAt'));
const packageSource = JSON.parse(await fs.readFile('package.json', 'utf8'));
assert.equal(packageSource.scripts['update:weather'], 'node scripts/update-weather.mjs');
const owned = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), 'rr-weather-hour-'));
const clean = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  new Set(['PATH','SYSTEMROOT','WINDIR','COMSPEC','PATHEXT','TEMP','TMP','TMPDIR','HOME','USERPROFILE','LANG','LC_ALL']).has(key.toUpperCase())));
try {
  await fs.mkdir(path.join(owned, 'scripts/lib'), { recursive: true });
  await fs.copyFile('scripts/lib/production-reference-time.mjs', path.join(owned, 'scripts/lib/production-reference-time.mjs'));
  await fs.writeFile(path.join(owned, 'package.json'), JSON.stringify({ type:'module', scripts:{'update:weather':packageSource.scripts['update:weather']} }));
  const fixture = [actualHour,
    "const descriptor = { productionReferenceAt:'2026-11-04T05:00:00.000Z' };",
    "const target = process.env.RAVRADAR_PRODUCTION_TARGET_HOUR;",
    "const need = (ok, code) => { if (!ok) throw new Error('ESTABLISHED_CURRENT_ORIGIN_' + code); };",
    "console.log('\\nACTUAL_ORIGIN_HOUR_GUARD_REACHED');", actualGate,
    "console.log(JSON.stringify({ kind:'ACTUAL_ORIGIN_HOUR_GUARD_ACCEPTED', target }));",
  ].join('\n');
  await fs.writeFile(path.join(owned, 'scripts/update-weather.mjs'), fixture);
  const run = (input, normalized) => spawnSync(process.execPath, normalized
    ? ['--input-type=module', '--eval', normalize + "\nprocess.env.RAVRADAR_PRODUCTION_TARGET_HOUR = canonical; await import('./scripts/update-weather.mjs');"]
    : ['scripts/update-weather.mjs'], { cwd:owned, env:{...clean,RAVRADAR_PRODUCTION_TARGET_HOUR:input}, encoding:'utf8', timeout:15000, maxBuffer:1024*1024, windowsHide:true });
  const plain = '2026-11-04T13:00:00Z', canonical = '2026-11-04T13:00:00.000Z';
  const before = run(plain, false);
  assert.equal(before.error, undefined); assert.equal(before.status, 1);
  assert.match(before.stderr, /ESTABLISHED_CURRENT_ORIGIN_594_LATER_TARGET/, 'Old direct package-script target reproduces the production Z refusal');
  for (const input of [plain, canonical]) {
    const result = run(input, true);
    assert.equal(result.error, undefined); assert.equal(result.signal, null); assert.equal(result.status, 0, result.stderr);
    assert(result.stdout.includes(JSON.stringify({kind:'ACTUAL_ORIGIN_HOUR_GUARD_ACCEPTED',target:canonical})));
  }
  for (const input of ['', 'unknown', '2026-11-04T13:15:00Z', '2026-02-30T13:00:00Z', '2026-11-04T13:00:00+00:00']) {
    const result = run(input, true);
    assert.equal(result.error, undefined); assert.equal(result.status, 1);
    assert(!result.stdout.includes('ACTUAL_ORIGIN_HOUR_GUARD_REACHED'), 'Invalid input must stop before origin, with no fallback clock');
  }
  for (const input of ['2026-11-04T05:00:00Z', '2026-11-04T04:00:00.000Z']) {
    const result = run(input, true);
    assert.equal(result.error, undefined); assert.equal(result.status, 1);
    assert.match(result.stderr, /ESTABLISHED_CURRENT_ORIGIN_594_LATER_TARGET/, 'Same or older actual H0 remains refused by origin');
  }
  if (process.platform === 'linux') {
    const oldCli = spawnSync('bash', ['-c','npm run update:weather'], {cwd:owned,
      env:{...clean,RAVRADAR_PRODUCTION_TARGET_HOUR:plain},encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
    assert.equal(oldCli.error,undefined); assert.equal(oldCli.status,1);
    assert.match(oldCli.stderr,/ESTABLISHED_CURRENT_ORIGIN_594_LATER_TARGET/,'Actual old npm caller reproduces plain-Z refusal');
    const cli = input => spawnSync('bash', ['-c',runBody + '\nprintf "\\nGLOBAL_TARGET=%s\\n" "$RAVRADAR_PRODUCTION_TARGET_HOUR"'], {
      cwd:owned, env:{...clean,RAVRADAR_PRODUCTION_TARGET_HOUR:input}, encoding:'utf8', timeout:30000, maxBuffer:1024*1024 });
    for (const input of [plain, canonical]) {
      const result = cli(input); assert.equal(result.error,undefined); assert.equal(result.signal,null); assert.equal(result.status,0,result.stderr);
      assert(result.stdout.includes(JSON.stringify({kind:'ACTUAL_ORIGIN_HOUR_GUARD_ACCEPTED',target:canonical})));
      assert(result.stdout.includes('GLOBAL_TARGET='+input), 'Actual Bash/npm caller must preserve the workflow parent spelling');
    }
    for (const input of ['', 'unknown', '2026-11-04T13:15:00Z']) {
      const result=cli(input); assert.equal(result.error,undefined); assert.equal(result.status,1);
      assert(!result.stdout.includes('ACTUAL_ORIGIN_HOUR_GUARD_REACHED'));
    }
    console.log('OK: actual Linux YAML -> Bash -> npm -> origin-hour guard; global target unchanged.');
  } else console.log('SKIP: actual Bash/npm execution requires Linux; actual heredoc -> origin-hour guard ran locally.');
  console.log('OK: actual workflow target normalizer reproduces plain-Z failure, accepts identical whole-hour Z/.000Z, and preserves invalid/same/older refusals.');
} finally {
  await fs.rm(owned, {recursive:true,force:true});
}
