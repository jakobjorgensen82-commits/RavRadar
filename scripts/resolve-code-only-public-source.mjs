import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RAVSCORE_KNOWN_PUBLIC_SOURCE_REPAIR_POLICY as REPAIR } from
  './lib/ravscore-known-public-source-repair.mjs';

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const DEPLOYMENT_PATTERN = /^pages-[1-9][0-9]*-[1-9][0-9]*$/;
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha256 = value => crypto.createHash('sha256')
  .update(JSON.stringify(canonical(value))).digest('hex');
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));

function assertCommonCentralSource(current, publicManifest) {
  if (current?.model !== 'integrated'
    || current?.status !== 'INTEGRATED_ACTIVE'
    || current?.pending !== false
    || !Number.isSafeInteger(Number(current?.centralVersion))
    || Number(current.centralVersion) < 1
    || !SHA256_PATTERN.test(String(current?.publicManifestSha256 ?? ''))
    || !SHA256_PATTERN.test(String(current?.activeImplementationClosureSha256 ?? ''))
    || !DEPLOYMENT_PATTERN.test(String(current?.deploymentId ?? ''))
    || !publicManifest || publicManifest.schemaVersion !== 4
    || publicManifest.complete !== true
    || publicManifest.zoneCount !== 210
    || publicManifest.coastalPartCount !== 673
    || !publicManifest.ravScoreModelBinding) {
    throw new Error('Code-only public source is not an exact active integrated deployment');
  }
}

export function resolveCodeOnlyPublicSource({ current, publicManifest } = {}) {
  assertCommonCentralSource(current, publicManifest);
  const observedManifestSha256 = sha256(publicManifest);
  if (observedManifestSha256 === current.publicManifestSha256) {
    if (!same(publicManifest.ravScoreModelBinding, current.modelBinding)) {
      throw new Error('Matching central/public manifest has a conflicting model binding');
    }
    return Object.freeze({
      schemaVersion: 'ravscore-code-only-public-source-v1',
      status: 'CENTRAL_AND_PUBLIC_MATCH',
      deploymentId: current.deploymentId,
      implementationClosureSha256: current.activeImplementationClosureSha256,
      repairId: null,
      sourceHead: current.sourceHead,
      publicManifestSha256: observedManifestSha256,
      privatePayloadRead: false,
    });
  }
  if (Number(current.centralVersion) !== REPAIR.centralVersion
    || current.sourceHead !== REPAIR.centralSourceHead
    || current.deploymentId !== REPAIR.centralDeploymentId
    || current.publicManifestSha256 !== REPAIR.centralPublicManifestSha256
    || current.activeImplementationClosureSha256
      !== REPAIR.centralImplementationClosureSha256
    || sha256(current.modelBinding) !== REPAIR.centralModelBindingSha256
    || observedManifestSha256 !== REPAIR.sourcePublicManifestSha256
    || sha256(publicManifest.ravScoreModelBinding)
      !== REPAIR.sourceModelBindingSha256) {
    throw new Error('Public RavScore source is ahead of central state without an exact repair policy');
  }
  return Object.freeze({
    schemaVersion: 'ravscore-code-only-public-source-v1',
    status: 'KNOWN_PUBLIC_SOURCE_REPAIR',
    deploymentId: REPAIR.sourceDeploymentId,
    implementationClosureSha256: REPAIR.sourceImplementationClosureSha256,
    repairId: REPAIR.id,
    sourceHead: REPAIR.sourceHead,
    publicManifestSha256: observedManifestSha256,
    privatePayloadRead: false,
  });
}

function argumentValue(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0 || !argv[index + 1] || argv[index + 1].startsWith('--')) {
    throw new Error(`Code-only public source resolver requires ${name}`);
  }
  return argv[index + 1];
}

async function atomicWriteJson(file, value) {
  const destination = path.resolve(file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp-${process.pid}-${crypto.randomBytes(5).toString('hex')}`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value)}\n`, { flag: 'wx', mode: 0o600 });
    await fs.rename(temporary, destination);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const [current, publicManifest] = await Promise.all([
    fs.readFile(argumentValue(argv, '--current'), 'utf8').then(JSON.parse),
    fs.readFile(argumentValue(argv, '--manifest'), 'utf8').then(JSON.parse),
  ]);
  const result = resolveCodeOnlyPublicSource({ current, publicManifest });
  await atomicWriteJson(argumentValue(argv, '--output'), result);
  console.log(`Code-only public source resolved: ${result.status}; private payload read: false.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
