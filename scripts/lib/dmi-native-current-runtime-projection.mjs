import { buildDmiForecastHourly } from './dmi-forecast-store.mjs';

/**
 * Project one already verified native DMI current row through the public
 * hourly forecast builder. The audit must compare both provenance and the
 * five-decimal U/V values actually consumed by the integrated adapter, not the
 * higher-precision native values that existed before production projection.
 * This audit-only adapter deliberately lives outside the model bundle: it
 * exercises production code without changing or copying that code.
 */
export function projectExactDmiNativeCurrentToForecast(nativeRow, productionReferenceAt) {
  const validMs = Date.parse(nativeRow?.time ?? '');
  const referenceMs = Date.parse(productionReferenceAt ?? '');
  const uMps = Number(nativeRow?.['current-u']);
  const vMps = Number(nativeRow?.['current-v']);
  const source = nativeRow?.sources?.current;
  if (!Number.isFinite(validMs) || !Number.isFinite(referenceMs)
    || !Number.isFinite(uMps) || !Number.isFinite(vMps) || !source) return null;
  const canonicalValidTime = new Date(validMs).toISOString();
  const projection = buildDmiForecastHourly({
    ocean: [{
      step: canonicalValidTime,
      'current-u': uMps,
      'current-v': vMps,
      provenance: { current: source },
    }],
    generatedAt: new Date(referenceMs).toISOString(),
    startAt: canonicalValidTime,
    hours: 1,
  });
  const row = projection.hourly?.[0];
  if (row?.time !== canonicalValidTime) return null;
  const projectedSource = row?.sources?.current;
  return projectedSource?.provider === 'missing'
    || !Number.isFinite(row.currentUMps) || !Number.isFinite(row.currentVMps)
    ? null
    : { source: projectedSource, currentUMps: row.currentUMps, currentVMps: row.currentVMps };
}
