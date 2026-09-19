import { selectedOpenMeteoPartRecord } from './open-meteo-part-bank.mjs';
import { selectedCopernicusComponentRecord } from './copernicus-component-index.mjs';

// Only the provider-specific opaque indexes can supply candidates. Copying
// verified=true, a hash or a source object into an arbitrary row is not enough.
export function qualifiedWeatherReserveCandidates(inputs, { part, validTime, component } = {}) {
  if (!part || component === 'waterLevel') return [];
  const cp = selectedCopernicusComponentRecord(inputs?.copernicusComponentIndex, { part, validTime, component });
  const om = selectedOpenMeteoPartRecord(inputs?.openMeteoComponentIndex, { part, validTime, component });
  return [cp ? { ...cp, recordId: cp.source.recordId } : null, om].filter(Boolean);
}

export function selectedWeatherReserveSource(candidate) {
  const { status: _internalAdmissionStatus, ...source } = candidate.source;
  return { ...source, componentRecordId: candidate.recordId, sourceClass: 'response-bound-official-component' };
}

export function verifiedSelectedWeatherReserve(row, inputs, { part, validTime, component } = {}) {
  const provenance = row?.[`${component}Provenance`];
  if (provenance?.status !== 'verified') return null;
  for (const candidate of qualifiedWeatherReserveCandidates(inputs, { part, validTime, component })) {
    const source = selectedWeatherReserveSource(candidate);
    if (Object.entries(candidate.values).every(([key, value]) => row[key] === value)
      && Object.entries(source).every(([key, value]) => JSON.stringify(provenance[key]) === JSON.stringify(value))) return candidate;
  }
  return null;
}
