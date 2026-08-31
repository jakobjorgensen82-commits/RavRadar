import {
  dmiExpectedIdentityForPart,
  verifiedDmiNativeComponentSource,
} from './ravscore-production-adapters.mjs';

const COMPONENTS = Object.freeze([
  Object.freeze({ component: 'wind', sourceKey: 'wind', fields: ['wind-u-10m', 'wind-v-10m'] }),
  Object.freeze({ component: 'windTail', sourceKey: 'windTail', fields: ['wind-tail-u-10m', 'wind-tail-v-10m'] }),
  Object.freeze({ component: 'wave', sourceKey: 'wave', fields: ['significant-wave-height', 'dominant-wave-period'] }),
  Object.freeze({ component: 'current', sourceKey: 'current', fields: ['current-u', 'current-v'] }),
  Object.freeze({ component: 'waterLevel', sourceKey: 'waterLevel', fields: ['sea-mean-deviation'] }),
  Object.freeze({ component: 'waterTemperature', sourceKey: 'waterTemperature', fields: ['water-temperature'] }),
]);

const finiteNumber = value => typeof value === 'number' && Number.isFinite(value);
const finitePoint = value => Array.isArray(value)
  && value.length === 2
  && value.every(finiteNumber);
const samePoint = (left, right, tolerance = 1e-7) => finitePoint(left)
  && finitePoint(right)
  && left.every((value, index) => Math.abs(value - right[index]) <= tolerance);

function identities({ stageId, zoneId, part } = {}) {
  if (typeof stageId !== 'string' || !stageId.startsWith('STAGED::')
    || typeof zoneId !== 'string' || !zoneId
    || typeof part?.partId !== 'string' || !part.partId
    || !finitePoint(part?.waterPoint)) {
    throw new Error('Private coastal-point stage identity is incomplete');
  }
  const privateIdentity = {
    entityId: stageId,
    parentZoneId: zoneId,
    entityType: 'private-stage',
    samplingContext: 'private-stage-water-point',
    samplingPoint: part.waterPoint.slice(0, 2),
  };
  const activeIdentity = dmiExpectedIdentityForPart({ ...part, zoneId });
  if (!activeIdentity) throw new Error('Active coastal-point DMI identity is incomplete');
  return { privateIdentity, activeIdentity };
}

function projectSource(source, rowTime, component, privateIdentity, activeIdentity, label) {
  const verified = verifiedDmiNativeComponentSource(
    source,
    rowTime,
    component,
    privateIdentity,
  );
  if (!verified) {
    throw new Error(`${label} lacks exact private-stage DMI provenance`);
  }
  return {
    ...source,
    entityId: activeIdentity.entityId,
    parentZoneId: activeIdentity.parentZoneId,
    entityType: activeIdentity.entityType,
    samplingContext: activeIdentity.samplingContext,
    samplingPoint: activeIdentity.samplingPoint.slice(0, 2),
  };
}

/**
 * Validate a private STAGED DMI zone before projecting only its sampling
 * identity to the canonical active PART identity. Native run, acquisition,
 * grid/cell, distance and component provenance remain byte-for-byte intact.
 * Raw vectors stay inside the private producer and are never logged here.
 */
export function projectVerifiedPrivateStageDmiZoneToPart(
  zone,
  { stageId, zoneId, part } = {},
) {
  if (!zone || typeof zone !== 'object' || Array.isArray(zone)
    || !samePoint(zone.samplingPoint, part?.waterPoint)
    || !zone.hourly || typeof zone.hourly !== 'object' || Array.isArray(zone.hourly)) {
    throw new Error('Private coastal-point stage DMI zone has an incompatible sampling point');
  }
  const { privateIdentity, activeIdentity } = identities({ stageId, zoneId, part });
  const projected = structuredClone(zone);
  projected.entityId = activeIdentity.entityId;
  projected.parentZoneId = activeIdentity.parentZoneId;
  projected.entityType = activeIdentity.entityType;
  projected.samplingContext = activeIdentity.samplingContext;
  projected.samplingPoint = activeIdentity.samplingPoint.slice(0, 2);

  for (const [rowKey, row] of Object.entries(projected.hourly)) {
    if (!row || typeof row !== 'object' || Array.isArray(row)
      || typeof row.time !== 'string' || row.time !== rowKey
      || !Number.isFinite(Date.parse(row.time))) {
      throw new Error('Private coastal-point stage DMI row has an invalid time');
    }
    const sources = row.sources && typeof row.sources === 'object' && !Array.isArray(row.sources)
      ? { ...row.sources }
      : {};
    for (const descriptor of COMPONENTS) {
      const presentFields = descriptor.fields.filter(field => Object.hasOwn(row, field));
      if (!presentFields.length) {
        if (Object.hasOwn(sources, descriptor.sourceKey)) {
          throw new Error(`Private coastal-point stage ${descriptor.component} source lacks its payload`);
        }
        continue;
      }
      if (presentFields.length !== descriptor.fields.length
        || presentFields.some(field => !finiteNumber(row[field]))) {
        throw new Error(`Private coastal-point stage ${descriptor.component} payload is incomplete`);
      }
      if (descriptor.component === 'wave') {
        const directionPresent = Object.hasOwn(row, 'mean-wave-dir');
        const directionAttested = Array.isArray(sources.wave?.optionalFieldSet)
          && sources.wave.optionalFieldSet.length === 1
          && sources.wave.optionalFieldSet[0] === 'mean-wave-dir';
        if (directionPresent !== directionAttested
          || (directionPresent && !finiteNumber(row['mean-wave-dir']))) {
          throw new Error('Private coastal-point stage wave direction lacks exact provenance');
        }
      }
      sources[descriptor.sourceKey] = projectSource(
        sources[descriptor.sourceKey],
        row.time,
        descriptor.component,
        privateIdentity,
        activeIdentity,
        `Private coastal-point stage ${descriptor.component}`,
      );
    }
    row.sources = sources;
  }
  return projected;
}
