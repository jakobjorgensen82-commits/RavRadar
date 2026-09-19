// Integrity bridge for the private Python component producer. This is NOT a
// provider/spatial admission policy. The consumer must also validate the exact
// central identity and independently authorised request/cell evidence.
import { createHash } from 'node:crypto';

export const CP_COMPONENT_PROJECTION_DOMAIN = 'cp-exact-part-component-projection-typed-ieee754be-v1';
export const CP_COMPONENT_PROJECTION_KIND = 'RAVRADAR_PRIVATE_CP_COMPONENT_PROJECTION';

export function binary64Hex(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('CP_COMPONENT_PROJECTION_NUMBER_INVALID');
  }
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setFloat64(0, value === 0 ? 0 : value, false);
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function hashFields(value) {
  if (typeof value === 'number') return `n:${binary64Hex(value)}`;
  if (typeof value === 'string') return `s:${value}`;
  if (Array.isArray(value)) return value.map(hashFields);
  if (value && typeof value === 'object') {
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      throw new Error('CP_COMPONENT_PROJECTION_OBJECT_INVALID');
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, hashFields(item)]));
  }
  if (value === null || typeof value === 'boolean') return value;
  throw new Error('CP_COMPONENT_PROJECTION_VALUE_INVALID');
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sealCopernicusComponentProjection(candidate) {
  const { projection: _ignored, ...fields } = candidate;
  const payload = {
    kind: CP_COMPONENT_PROJECTION_KIND,
    schemaVersion: 1,
    hashDomain: CP_COMPONENT_PROJECTION_DOMAIN,
    payload: hashFields(fields),
  };
  return {
    ...payload,
    projectionSha256: `sha256:${createHash('sha256').update(canonical(payload), 'utf8').digest('hex')}`,
  };
}

/** Bind raw values AND every proof field to one projection. Not admission. */
export function verifyCopernicusComponentProjection(candidate) {
  try {
    const supplied = candidate?.projection;
    if (!supplied || Object.keys(supplied).sort().join(',') !== 'hashDomain,kind,payload,projectionSha256,schemaVersion') return false;
    const expected = sealCopernicusComponentProjection(candidate);
    return canonical(supplied) === canonical(expected);
  } catch {
    return false;
  }
}
