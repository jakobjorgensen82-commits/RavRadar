import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import saveOwnedDmiGrib from '../../.github/actions/save-owned-dmi-grib/index.cjs';

const checker = fileURLToPath(new URL('../prove-saved-raw-cache.py', import.meta.url));
const root = fileURLToPath(new URL('../../', import.meta.url));

export function verifySavedRawCaptureCoverage({ plan, savedInventory }) {
  const { cacheId, inventorySha256 } = savedInventory ?? {};
  if (!Number.isSafeInteger(cacheId) || cacheId < 1
    || !/^[a-f0-9]{64}$/.test(inventorySha256 ?? '')
    || Object.keys(savedInventory).length !== 2
    || saveOwnedDmiGrib.rawInventorySha256() !== inventorySha256) {
    throw new Error('DMI_SAVED_RAW_INVENTORY_UNPROVED');
  }
  const bytes = Buffer.from(JSON.stringify(plan));
  if (bytes.length > 4 * 1024 * 1024) throw new Error('DMI_SAVED_RAW_PLAN_BOUND');
  let result;
  try {
    result = JSON.parse(execFileSync('python3', ['-B', checker], {
      cwd: root, input: bytes, maxBuffer: 4096, timeout: 90_000,
      encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
    }));
  } catch {
    throw new Error('DMI_SAVED_RAW_CAPTURES_UNVERIFIED');
  }
  if (Object.keys(result ?? {}).length !== 1
    || !Number.isSafeInteger(result.verifiedCaptureCount)
    || result.verifiedCaptureCount !== plan.captures.length
    || saveOwnedDmiGrib.rawInventorySha256() !== inventorySha256) {
    throw new Error('DMI_SAVED_RAW_CAPTURES_UNVERIFIED');
  }
  return {
    cacheId, inventorySha256, capturePlanSha256: createHash('sha256').update(bytes).digest('hex'),
    verifiedCaptureCount: result.verifiedCaptureCount,
  };
}
