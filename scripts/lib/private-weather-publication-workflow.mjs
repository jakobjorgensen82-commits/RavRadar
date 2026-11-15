// Pure normal publication wiring and one additive owner operation.
// No I/O, credentials, dispatch or calculation/data admission.
const fail = code => { throw Object.assign(new Error(code), { code }); };
export const WEATHER_PUBLICATION_COMMANDS = Object.freeze([
  "node scripts/test-r2-private-runtime-storage.mjs",
  "node --test scripts/test-ordinary-completed-stage-source.mjs"
]);
export const WEATHER_PUBLICATION_PATHS = Object.freeze([
  "scripts/publish-private-weather-runtime.mjs",
  "scripts/lib/private-weather-publication-workflow.mjs",
  "scripts/ordinary-completed-stage-admission.mjs",
  "scripts/ordinary-completed-stage-source.mjs",
  "scripts/test-r2-private-runtime-storage.mjs",
  "scripts/test-ordinary-completed-stage-admission.mjs",
  "scripts/test-ordinary-completed-stage-source.mjs"
]);

export function inversePrivateWeatherPublicationWorkflow(bytes) {
  const source = bytes.toString('utf8');
  if (!Buffer.from(source).equals(bytes)) fail('ORDINARY_STAGE_SOURCE_WORKFLOW_INVERSE');
  const name = 'scripts/publish-private-weather-runtime.mjs';
  if (!source.includes(name)) return bytes;
  const calls = [
    '            node scripts/protected-private-production-runtime.mjs \\\n'
      + '              --publish \\\n'
      + '              --private-root "$RAVRADAR_PRIVATE_RUNTIME_ROOT" \\\n'
      + '              --bundle "$RAVRADAR_PRIVATE_RUNTIME_BUNDLE" \\\n'
      + '              --repository-root "$GITHUB_WORKSPACE" \\\n'
      + '              --expected .cache/private-production-runtime-expected.json \\\n'
      + '              --source-head "$GITHUB_SHA"\n',
    '          node scripts/protected-private-production-runtime.mjs --publish \\\n'
      + '            --private-root "$RAVRADAR_PRIVATE_RUNTIME_ROOT" \\\n'
      + '            --bundle "$RAVRADAR_PRIVATE_RUNTIME_BUNDLE" \\\n'
      + '            --repository-root "$GITHUB_WORKSPACE" \\\n'
      + '            --expected .cache/private-production-runtime-expected.json \\\n'
      + '            --source-head "$GITHUB_SHA" \\\n'
      + '            "${same_reference_args[@]}"\n',
  ];
  const matches = calls.filter(call => source.includes(call.replace('scripts/protected-private-production-runtime.mjs', name)));
  if (source.split(name).length !== 2 || matches.length !== 1) fail('ORDINARY_STAGE_SOURCE_WORKFLOW_INVERSE');
  const original = matches[0];
  return Buffer.from(source.replace(original.replace('scripts/protected-private-production-runtime.mjs', name), original));
}

export function isPrivateWeatherPublicationWorkflowChange(before, after) {
  try {
    const old = Buffer.from(before), next = Buffer.from(after);
    return !old.equals(next) && inversePrivateWeatherPublicationWorkflow(old).equals(old)
      && inversePrivateWeatherPublicationWorkflow(next).equals(old);
  } catch { return false; }
}

export const PRIVATE_WEATHER_PUBLICATION_OWNER_EDITS = Object.freeze([
  [
    "import {analyzeSourceDomainInputs} from './source-impact-domain-inputs.mjs';\n",
    "import { inversePrivateWeatherPublicationWorkflow, isPrivateWeatherPublicationWorkflowChange, WEATHER_PUBLICATION_COMMANDS, WEATHER_PUBLICATION_PATHS } from './lib/private-weather-publication-workflow.mjs';\nimport {analyzeSourceDomainInputs} from './source-impact-domain-inputs.mjs';\n"
  ],
  [
    "  // Aktuel faktisk kildegate + arkivkontrakt.",
    "  weatherPublication:WEATHER_PUBLICATION_COMMANDS,\n  // Aktuel faktisk kildegate + arkivkontrakt."
  ],
  [
    "  // Disse kendte historiske/metakontroller",
    "  weatherPublication:WEATHER_PUBLICATION_PATHS,\n  // Disse kendte historiske/metakontroller"
  ],
  [
    "  try{assert(before!==after);const restored=restoreOwnedDmiBudgetSteps(before,after);\n",
    "  try{assert(before!==after);if(isPrivateWeatherPublicationWorkflowChange(before,after))return ['weatherPublication'];\n    const restored=restoreOwnedDmiBudgetSteps(before,after);\n"
  ],
  [
    "      const dmiAreas=file===WEATHER_BUILD?dmiBudgetWeatherBuildAreas(\n",
    "      const dmiAreas=(file===WEATHER_BUILD||file==='.github/workflows/deploy-code-only-repair.yml')?dmiBudgetWeatherBuildAreas(\n"
  ],
  [
    "areas.includes('workflowSupport')||areas.includes('dmiBudget')",
    "areas.includes('workflowSupport')||areas.includes('weatherPublication')||areas.includes('dmiBudget')"
  ]
].map(row => Object.freeze(row)));

// Directional, additive ownership only. The previous entire planner is rebuilt
// byte-exactly; removal, altered routing/flags or any other old byte is refused.
export function isAdditivePrivateWeatherPublicationOwnerChange(before, after) {
  if (!Buffer.isBuffer(before) || !Buffer.isBuffer(after)) return false;
  const old = before.toString('utf8');
  let next = after.toString('utf8');
  if (!Buffer.from(old).equals(before) || !Buffer.from(next).equals(after)
    || old.includes('weatherPublication') || old.includes('private-weather-publication-workflow.mjs')) return false;

  for (const [original, added] of PRIVATE_WEATHER_PUBLICATION_OWNER_EDITS) {
    if (old.split(original).length !== 2 || old.includes(added) || next.split(added).length !== 2) return false;
    next = next.replace(added, original);
  }
  return Buffer.from(next).equals(before);
}
